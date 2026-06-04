"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { validateCatalogImageFile } from "@/lib/storage/catalog-images";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  modelCode: string;
  onCreated: (spare: {
    model_code: string;
    spare_code: string;
    spare_name: string;
    price: number | string | null;
    quantity: number | null;
    image_url?: string | null;
  }) => void;
};

async function uploadSpareImage(modelCode: string, spareCode: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", "spare");
  formData.append("model_code", modelCode);
  formData.append("spare_code", spareCode);

  const res = await fetch("/api/warehouse/catalog-image", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Image upload failed");
  return data.image_url as string;
}

export default function SpareDialog({
  open,
  setOpen,
  modelCode,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setName("");
    setPrice("");
    setImageFile(null);
    setImagePreview(null);
    setError("");
  }

  function handleImagePick(file: File | null) {
    if (!file) return;
    const validationError = validateCatalogImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function create() {
    if (!modelCode) {
      setError("Select a model before creating a spare.");
      return;
    }

    if (!name.trim()) {
      setError("Spare name is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/warehouse/spares", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_code: modelCode,
          spare_name: name,
          price,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create spare");
        return;
      }

      let imageUrl: string | null = data.image_url ?? null;
      if (imageFile) {
        try {
          imageUrl = await uploadSpareImage(modelCode, data.spare_code, imageFile);
        } catch (uploadError) {
          setError(
            uploadError instanceof Error
              ? `Spare created but image failed: ${uploadError.message}`
              : "Spare created but image upload failed"
          );
          onCreated({ ...data, image_url: null });
          return;
        }
      }

      onCreated({ ...data, image_url: imageUrl });
      resetForm();
      setOpen(false);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Spare Model</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="spare-name">Spare name</Label>
            <Input
              id="spare-name"
              placeholder="Spare name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="spare-price">Listed price</Label>
            <Input
              id="spare-price"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Spare image (optional, max 2MB)</Label>
            <div className="flex items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-slate-900/40">
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <ImagePlus className="size-6 text-slate-400" />
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleImagePick(e.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  {imageFile ? "Change image" : "Choose image"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <DialogFooter>
          <Button onClick={create} disabled={loading}>
            {loading ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
