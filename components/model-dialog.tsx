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
  onCreated: (model: {
    model_code: string;
    model_name: string;
    price: number | string | null;
    quantity: number | null;
  }) => void;
};

export default function ModelDialog({
  open,
  setOpen,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createModel() {
    if (!name.trim() || !price.trim()) {
      setError("Model name and price are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/warehouse/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_name: name,
          price,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create");
        return;
      }

      onCreated(data);
      setName("");
      setPrice("");
      setOpen(false);
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
          <DialogTitle>Create Vehicle Model</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="vehicle-model-name">Model name</Label>
            <Input
              id="vehicle-model-name"
              placeholder="Model name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle-model-price">Listed price</Label>
            <Input
              id="vehicle-model-price"
              placeholder="Model price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">
              {error}
            </p>
          )}

        </div>

        <DialogFooter>

          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>

          <Button
            onClick={createModel}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create"}
          </Button>

        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
