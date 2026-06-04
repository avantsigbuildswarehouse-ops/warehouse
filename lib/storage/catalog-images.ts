export const CATALOG_IMAGES_BUCKET = "catalog-images";
export const MAX_CATALOG_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB
export const ALLOWED_CATALOG_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export type CatalogImageKind = "vehicle" | "spare";

export function validateCatalogImageFile(file: File) {
  if (!ALLOWED_CATALOG_IMAGE_TYPES.has(file.type)) {
    return "Only JPEG, PNG, or WebP images are allowed.";
  }
  if (file.size > MAX_CATALOG_IMAGE_BYTES) {
    return "Image must be 2MB or smaller.";
  }
  return null;
}

export function buildCatalogImagePath(
  kind: CatalogImageKind,
  modelCode: string,
  spareCode?: string
) {
  const safeModel = modelCode.replace(/[^a-zA-Z0-9-_]/g, "_");
  if (kind === "vehicle") {
    return `vehicles/${safeModel}/cover.webp`;
  }
  const safeSpare = (spareCode || "").replace(/[^a-zA-Z0-9-_]/g, "_");
  return `spares/${safeModel}/${safeSpare}/cover.webp`;
}

export function getCatalogImageExtension(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export function buildCatalogImagePathWithExt(
  kind: CatalogImageKind,
  modelCode: string,
  mimeType: string,
  spareCode?: string
) {
  const ext = getCatalogImageExtension(mimeType);
  const safeModel = modelCode.replace(/[^a-zA-Z0-9-_]/g, "_");
  if (kind === "vehicle") {
    return `vehicles/${safeModel}/cover.${ext}`;
  }
  const safeSpare = (spareCode || "").replace(/[^a-zA-Z0-9-_]/g, "_");
  return `spares/${safeModel}/${safeSpare}/cover.${ext}`;
}

export function getPublicCatalogImageUrl(supabaseUrl: string, storagePath: string) {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${CATALOG_IMAGES_BUCKET}/${storagePath}`;
}
