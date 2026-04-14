"use client";

import { useState } from "react";
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
  }) => void;
};

export default function SpareDialog({
  open,
  setOpen,
  modelCode,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      onCreated(data);
      setOpen(false);
      setName("");
      setPrice("");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
        </div>

        {error && <p className="text-red-500">{error}</p>}

        <DialogFooter>
          <Button onClick={create} disabled={loading}>
            {loading ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
