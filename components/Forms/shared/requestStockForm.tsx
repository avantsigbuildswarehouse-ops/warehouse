"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bike, CheckCircle2, PackageOpen, Plus, Trash2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  BikeItem,
  CartItem,
  RequestFormConfig,
  RequestItemType,
  RequestResult,
  SpareItem,
} from "@/types/request-stock";

export default function RequestStockForm({ config }: { config: RequestFormConfig }) {
  const [itemType, setItemType] = useState<RequestItemType>("Bike");
  const [bikes, setBikes] = useState<BikeItem[]>([]);
  const [spares, setSpares] = useState<SpareItem[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [requestQuantity, setRequestQuantity] = useState<number | "">("");
  const [remarks, setRemarks] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [requestResult, setRequestResult] = useState<RequestResult | null>(null);
  const [requestedEngineNumbers, setRequestedEngineNumbers] = useState<Set<string>>(new Set());
  const [requestedSerialNumbers, setRequestedSerialNumbers] = useState<Set<string>>(new Set());

  const cartItemType = useMemo(() => (cart.length > 0 ? cart[0].itemType : null), [cart]);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const [bkRes, spRes] = await Promise.all([fetch(config.fetchBikesUrl), fetch(config.fetchSparesUrl)]);
      const [bkData, spData] = await Promise.all([bkRes.json(), spRes.json()]);

      const availableBikes = (bkData.items || []).filter(
        (item: BikeItem) => !requestedEngineNumbers.has(item.engine_number),
      );
      const availableSpares = (spData.items || []).filter(
        (item: SpareItem) => !requestedSerialNumbers.has(item.serial_number),
      );

      setBikes(availableBikes);
      setSpares(availableSpares);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [config.fetchBikesUrl, config.fetchSparesUrl, requestedEngineNumbers, requestedSerialNumbers]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const availableBikeModels = useMemo(() => {
    const map = new Map<string, { name: string; colors: Set<string> }>();
    bikes.forEach((item) => {
      if (!map.has(item.model_code)) {
        map.set(item.model_code, { name: item.model_name, colors: new Set() });
      }
      map.get(item.model_code)?.colors.add(item.color);
    });
    return Array.from(map.entries()).map(([code, data]) => ({
      code,
      name: data.name,
      colors: Array.from(data.colors),
    }));
  }, [bikes]);

  const availableSpareTypes = useMemo(() => {
    const map = new Map<string, { name: string }>();
    spares.forEach((item) => {
      if (!map.has(item.model_code)) {
        map.set(item.model_code, { name: item.spare_name });
      }
    });
    return Array.from(map.entries()).map(([code, data]) => ({ code, name: data.name }));
  }, [spares]);

  const availableColorsForModel = useMemo(() => {
    if (itemType !== "Bike" || !selectedModel) return [];
    return availableBikeModels.find((item) => item.code === selectedModel)?.colors || [];
  }, [availableBikeModels, itemType, selectedModel]);

  const getAvailableCount = useCallback(
    (modelCode: string, color?: string) => {
      if (itemType === "Bike") {
        if (color) return bikes.filter((item) => item.model_code === modelCode && item.color === color).length;
        return bikes.filter((item) => item.model_code === modelCode).length;
      }
      return spares.filter((item) => item.model_code === modelCode).length;
    },
    [bikes, itemType, spares],
  );

  const cartTotals = useMemo(() => {
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    return { totalQuantity, totalValue };
  }, [cart]);

  const addToCart = useCallback(() => {
    if (!selectedModel || !requestQuantity || typeof requestQuantity !== "number" || requestQuantity <= 0) return;
    if (itemType === "Bike" && !selectedColor) {
      alert("Please select a color");
      return;
    }

    const cartId = `${itemType}-${selectedModel}-${selectedColor || ""}`;
    const availableItems =
      itemType === "Bike"
        ? bikes.filter(
            (item) =>
              item.model_code === selectedModel &&
              item.color === selectedColor &&
              !requestedEngineNumbers.has(item.engine_number),
          )
        : spares.filter(
            (item) => item.model_code === selectedModel && !requestedSerialNumbers.has(item.serial_number),
          );

    const selectedItems = availableItems.slice(0, requestQuantity);
    if (selectedItems.length === 0) {
      alert("No available items to add. They may have been already requested.");
      return;
    }
    if (selectedItems.length < requestQuantity) {
      alert(`Only ${selectedItems.length} available. Added ${selectedItems.length} to cart.`);
    }

    const unitPrice = selectedItems[0]?.price || 0;
    const modelName =
      itemType === "Bike"
        ? availableBikeModels.find((item) => item.code === selectedModel)?.name || ""
        : availableSpareTypes.find((item) => item.code === selectedModel)?.name || "";

    setCart((prev) => {
      const existing = prev.find((item) => item.id === cartId);
      if (existing) {
        return prev.map((item) =>
          item.id === cartId
            ? { ...item, quantity: item.quantity + selectedItems.length, items: [...item.items, ...selectedItems] }
            : item,
        );
      }
      return [
        ...prev,
        {
          id: cartId,
          itemType,
          modelCode: selectedModel,
          modelName,
          color: selectedColor,
          quantity: selectedItems.length,
          unitPrice,
          items: selectedItems,
        },
      ];
    });

    if (itemType === "Bike") {
      const bikeItems = selectedItems as BikeItem[];
      const addedEngines = new Set(bikeItems.map((item) => item.engine_number));
      setBikes((prev) => prev.filter((item) => !addedEngines.has(item.engine_number)));
    } else {
      const spareItems = selectedItems as SpareItem[];
      const addedSerials = new Set(spareItems.map((item) => item.serial_number));
      setSpares((prev) => prev.filter((item) => !addedSerials.has(item.serial_number)));
    }

    setSelectedModel("");
    setSelectedColor("");
    setRequestQuantity("");
  }, [
    availableBikeModels,
    availableSpareTypes,
    bikes,
    itemType,
    requestQuantity,
    requestedEngineNumbers,
    requestedSerialNumbers,
    selectedColor,
    selectedModel,
    spares,
  ]);

  const removeFromCart = useCallback((cartId: string) => {
    setCart((prev) => {
      const item = prev.find((entry) => entry.id === cartId);
      if (item) {
        if (item.itemType === "Bike") {
          setBikes((prevBikes) => [...prevBikes, ...(item.items as BikeItem[])]);
        } else {
          setSpares((prevSpares) => [...prevSpares, ...(item.items as SpareItem[])]);
        }
      }
      return prev.filter((entry) => entry.id !== cartId);
    });
  }, []);

  const handleRequest = useCallback(async () => {
    if (!cart.length) return;
    if (!config.targetCodeValue) {
      alert(`${config.targetCodeLabel} code is missing`);
      return;
    }

    setIssuing(true);
    try {
      const cartItem = cart[0];
      const itemIdentifiers =
        cartItem.itemType === "Bike"
          ? (cartItem.items as BikeItem[]).map((item) => item.engine_number)
          : (cartItem.items as SpareItem[]).map((item) => item.serial_number);

      const res = await fetch(config.submitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [`${config.targetCodeLabel}Code`]: config.targetCodeValue,
          itemType: cartItem.itemType,
          items: itemIdentifiers,
          remarks: remarks || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes("No AVAILABLE")) {
          setCart([]);
          loadInventory();
          throw new Error("These items are no longer available. Cart cleared.");
        }
        throw new Error(data.error || "Failed to submit request");
      }

      if (cartItem.itemType === "Bike") {
        setRequestedEngineNumbers((prev) => {
          const next = new Set(prev);
          itemIdentifiers.forEach((id: string) => next.add(id));
          return next;
        });
      } else {
        setRequestedSerialNumbers((prev) => {
          const next = new Set(prev);
          itemIdentifiers.forEach((id: string) => next.add(id));
          return next;
        });
      }

      setRequestResult({
        itemCount: cartTotals.totalQuantity,
        targetName: config.targetCodeValue,
        referenceNo: data.referenceNo,
      });
      setCart([]);
      setRemarks("");
    } catch (error: unknown) {
      console.error("Request error:", error);
      const message = error instanceof Error ? error.message : "Error submitting request.";
      alert(message);
    } finally {
      setIssuing(false);
    }
  }, [cart, cartTotals.totalQuantity, config, loadInventory, remarks]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900 dark:border-white" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <Badge className="w-fit" variant="outline">
            Stock Request
          </Badge>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Request Inventory Stock
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Select vehicles or spare parts to request from warehouse. You can only request one type at a time.
            </p>
          </div>
        </div>

        {requestResult ? (
          <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                <div>
                  <CardTitle className="text-emerald-800 dark:text-emerald-300">Successfully Requested</CardTitle>
                  <CardDescription className="text-emerald-600">Ref: {requestResult.referenceNo}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                <span className="font-semibold">
                  {requestResult.itemCount} {requestResult.itemCount === 1 ? "unit" : "units"}
                </span>{" "}
                requested successfully!
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  setRequestResult(null);
                  loadInventory();
                }}
                variant="outline"
              >
                Make Another Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <CardContent className="space-y-6 pt-6">
              <div>
                <h3 className="mb-4 text-xl font-semibold text-slate-800 dark:text-white">Add Items to Request</h3>
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800/30">
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={cartItemType === "Spare"}
                      onClick={() => {
                        if (!cartItemType) {
                          setItemType("Bike");
                          setSelectedModel("");
                          setSelectedColor("");
                          setRequestQuantity("");
                        }
                      }}
                      variant={itemType === "Bike" ? "default" : "outline"}
                    >
                      <Bike className="mr-2 h-4 w-4" />
                      Vehicles
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={cartItemType === "Bike"}
                      onClick={() => {
                        if (!cartItemType) {
                          setItemType("Spare");
                          setSelectedModel("");
                          setRequestQuantity("");
                        }
                      }}
                      variant={itemType === "Spare" ? "default" : "outline"}
                    >
                      <Wrench className="mr-2 h-4 w-4" />
                      Spare Parts
                    </Button>
                  </div>

                  {cartItemType && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Cart contains {cartItemType === "Bike" ? "vehicles" : "spare parts"}. Clear cart to switch type.
                    </p>
                  )}

                  <select
                    className="h-10 w-full rounded-xl border bg-white px-3 text-sm dark:bg-slate-950/60 dark:text-white"
                    onChange={(event) => {
                      setSelectedModel(event.target.value);
                      setSelectedColor("");
                      setRequestQuantity("");
                    }}
                    value={selectedModel}
                  >
                    <option value="">-- Select Model --</option>
                    {itemType === "Bike"
                      ? availableBikeModels.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.name} ({getAvailableCount(item.code)} available)
                          </option>
                        ))
                      : availableSpareTypes.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.name} ({getAvailableCount(item.code)} available)
                          </option>
                        ))}
                  </select>

                  {itemType === "Bike" && selectedModel && (
                    <select
                      className="h-10 w-full rounded-xl border bg-white px-3 text-sm dark:bg-slate-950/60 dark:text-white"
                      onChange={(event) => {
                        setSelectedColor(event.target.value);
                        setRequestQuantity("");
                      }}
                      value={selectedColor}
                    >
                      <option value="">-- Select Color --</option>
                      {availableColorsForModel.map((color) => (
                        <option key={color} value={color}>
                          {color} ({getAvailableCount(selectedModel, color)} available)
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="flex gap-2">
                    <Input
                      className="h-10 flex-1 rounded-xl"
                      disabled={!selectedModel || (itemType === "Bike" && !selectedColor)}
                      min="1"
                      onChange={(event) => {
                        const val = parseInt(event.target.value, 10);
                        setRequestQuantity(!Number.isNaN(val) ? Math.min(val, getAvailableCount(selectedModel, selectedColor)) : "");
                      }}
                      placeholder="Quantity"
                      type="number"
                      value={requestQuantity}
                    />
                    <Button
                      disabled={!selectedModel || !requestQuantity || (itemType === "Bike" && !selectedColor)}
                      onClick={addToCart}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {cart.length > 0 && (
                <>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        className="flex items-center justify-between rounded-lg border bg-slate-50 p-3 dark:bg-slate-800/30"
                        key={item.id}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{item.modelName}</span>
                            {item.color && (
                              <Badge className="text-xs" variant="secondary">
                                {item.color}
                              </Badge>
                            )}
                            <Badge className="text-xs" variant="outline">
                              {item.quantity} units
                            </Badge>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              @ Rs {item.unitPrice.toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Subtotal: Rs {(item.quantity * item.unitPrice).toLocaleString()}
                          </p>
                        </div>
                        <Button className="text-red-500" onClick={() => removeFromCart(item.id)} size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-800/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">Total Quantity</p>
                        <p className="text-2xl font-bold">{cartTotals.totalQuantity}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500">Total Value</p>
                        <p className="text-2xl font-bold">Rs {cartTotals.totalValue.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label className="mb-2 block">Remarks (Optional)</Label>
                <textarea
                  className="h-24 w-full resize-none rounded-xl border bg-white px-3 py-2 text-sm dark:bg-slate-950/60 dark:text-white"
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Add any special instructions..."
                  value={remarks}
                />
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <Button disabled={!cart.length || issuing} onClick={() => setCart([])} variant="outline">
                  Clear All
                </Button>
                <Button disabled={issuing || !cart.length} onClick={handleRequest}>
                  <PackageOpen className="mr-2 h-4 w-4" />
                  {issuing ? "Processing..." : `Submit Request (${cartTotals.totalQuantity} units)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
