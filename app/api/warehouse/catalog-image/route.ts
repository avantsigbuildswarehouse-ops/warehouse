import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  ALLOWED_CATALOG_IMAGE_TYPES,
  buildCatalogImagePathWithExt,
  CATALOG_IMAGES_BUCKET,
  getPublicCatalogImageUrl,
  MAX_CATALOG_IMAGE_BYTES,
  type CatalogImageKind,
} from "@/lib/storage/catalog-images";

const supabaseAdmin = getSupabaseAdmin();

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (buckets?.some((b) => b.name === CATALOG_IMAGES_BUCKET)) return;

  await supabaseAdmin.storage.createBucket(CATALOG_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: MAX_CATALOG_IMAGE_BYTES,
    allowedMimeTypes: Array.from(ALLOWED_CATALOG_IMAGE_TYPES),
  });
}

export async function POST(req: Request) {
  const authError = await requireAdminRoute();
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const kind = formData.get("kind") as CatalogImageKind | null;
    const modelCode = String(formData.get("model_code") ?? "").trim();
    const spareCode = String(formData.get("spare_code") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }
    if (kind !== "vehicle" && kind !== "spare") {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    if (!modelCode) {
      return NextResponse.json({ error: "model_code is required" }, { status: 400 });
    }
    if (kind === "spare" && !spareCode) {
      return NextResponse.json({ error: "spare_code is required for spare images" }, { status: 400 });
    }
    if (!ALLOWED_CATALOG_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, or WebP images are allowed" },
        { status: 400 }
      );
    }
    if (file.size > MAX_CATALOG_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image must be 2MB or smaller" }, { status: 400 });
    }

    await ensureBucket();

    const storagePath = buildCatalogImagePathWithExt(
      kind,
      modelCode,
      file.type,
      kind === "spare" ? spareCode : undefined
    );

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from(CATALOG_IMAGES_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.json({ error: "Missing Supabase URL configuration" }, { status: 500 });
    }

    const imageUrl = getPublicCatalogImageUrl(supabaseUrl, storagePath);

    const table = kind === "vehicle" ? "vehicle_model_codes" : "vehicle_spare_codes";
    let updateQuery = supabaseAdmin
      .schema("warehouse")
      .from(table)
      .update({ image_url: imageUrl })
      .eq("model_code", modelCode);

    if (kind === "spare") {
      updateQuery = updateQuery.eq("spare_code", spareCode);
    }

    const { data, error: dbError } = await updateQuery.select().single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, image_url: imageUrl, record: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
