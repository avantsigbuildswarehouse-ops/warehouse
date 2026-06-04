"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { validateCatalogImageFile, type CatalogImageKind } from "@/lib/storage/catalog-images";

type CatalogImageFieldProps = {
  kind: CatalogImageKind;
  modelCode?: string;
  spareCode?: string;
  imageUrl?: string | null;
  disabled?: boolean;
  onUploaded: (imageUrl: string) => void;
};

export function CatalogImageField({
  kind,
  modelCode,
  spareCode,
  imageUrl,
  disabled,
  onUploaded,
}: CatalogImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = previewUrl || imageUrl || null;
  const canUpload = Boolean(modelCode) && (kind === "vehicle" || spareCode) && !disabled;

  async function handleFileChange(file: File | null) {
    if (!file || !modelCode) return;
    if (kind === "spare" && !spareCode) {
      setError("Save spare code first before uploading an image.");
      return;
    }

    const validationError = validateCatalogImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      formData.append("model_code", modelCode);
      if (kind === "spare" && spareCode) {
        formData.append("spare_code", spareCode);
      }

      const res = await fetch("/api/warehouse/catalog-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      onUploaded(data.image_url as string);
      setPreviewUrl(data.image_url as string);
    } catch (uploadError) {
      setPreviewUrl(imageUrl || null);
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  }

  return (
    <div className="space-y-2">
      <Label>Model image (max 2MB)</Label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:border-white/15 dark:bg-slate-900/40">
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt="Catalog"
              width={112}
              height={112}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <ImagePlus className="size-8 text-slate-400" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={!canUpload || uploading}
            onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canUpload || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 size-4" />
                {displayUrl ? "Replace image" : "Upload image"}
              </>
            )}
          </Button>
          {!modelCode && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create the {kind === "vehicle" ? "model" : "spare code"} first, then upload an image.
            </p>
          )}
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
