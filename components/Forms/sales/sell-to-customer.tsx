"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Package, ShoppingCart, Truck, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoneyForInput, moneyInputToNumber, sanitizeMoneyInput } from "@/components/Forms/sales/sales-utils";

type VehicleRow = {
  id: string;
  model_code: string;
  engine_number: string;
  chassis_number: string;
  color: string | null;
  yom: string | null;
  version: string | null;
  price: number | null;
  issued_at: string;
};

type SpareRow = {
  id: string;
  model_code: string;
  spare_code: string;
  serial_number: string;
  price: number | null;
  issued_at: string;
};

interface SellToCustomerFormProps {
  filterCategory?: "bikes" | "spares";
}

export default function SellToCustomerForm({ filterCategory }: SellToCustomerFormProps) {
  const params = useParams();
  const dealerCode = (params.dealerCode as string | undefined) || "";
  const showroomCode = (params.showroomCode as string | undefined) || "";

  const targetType = dealerCode ? "dealer" : "showroom";
  const targetCode = dealerCode || showroomCode;

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [spares, setSpares] = useState<SpareRow[]>([]);
  const [query, setQuery] = useState("");
  const [selectedBikeIds, setSelectedBikeIds] = useState<Set<string>>(new Set());
  const [cartSpares, setCartSpares] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [nic, setNic] = useState("");

  const [basePrice, setBasePrice] = useState<string>("");
  const [registrationFee, setRegistrationFee] = useState<string>("");
  const [discount, setDiscount] = useState<string>("");
  const [advancePayment, setAdvancePayment] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [isBasePriceManuallyEdited, setIsBasePriceManuallyEdited] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setSuccess(null);
      setErrorMessage(null);

      const response = await fetch(`/api/sales/inventory?targetType=${targetType}&targetCode=${encodeURIComponent(targetCode)}`);
      const data = await response.json();
      if (response.ok) {
        setVehicles(data.vehicles || []);
        setSpares(data.spares || []);
      } else {
        setVehicles([]);
        setSpares([]);
        setErrorMessage(data.error || "Failed to load available inventory");
      }
      setLoading(false);
    };

    if (targetCode) void load();
  }, [targetCode, targetType]);

  const totalSelectedPrice = useMemo(() => {
    let total = 0;

    selectedBikeIds.forEach((bikeId) => {
      const bike = vehicles.find((vehicle) => vehicle.id === bikeId);
      if (bike?.price) total += bike.price;
    });

    cartSpares.forEach((spareId) => {
      const spare = spares.find((row) => row.id === spareId);
      if (spare?.price) total += spare.price;
    });

    return total;
  }, [cartSpares, selectedBikeIds, spares, vehicles]);

  useEffect(() => {
    if (!isBasePriceManuallyEdited) {
      setBasePrice(formatMoneyForInput(totalSelectedPrice.toString()));
    }
  }, [isBasePriceManuallyEdited, totalSelectedPrice]);

  useEffect(() => {
    if (selectedBikeIds.size === 0 && cartSpares.size === 0) {
      setIsBasePriceManuallyEdited(false);
    }
  }, [cartSpares, selectedBikeIds]);

  useEffect(() => {
    if (selectedBikeIds.size === 0) {
      setRegistrationFee("");
      setAdvancePayment("");
    }
  }, [selectedBikeIds]);

  const filteredVehicles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((vehicle) =>
      `${vehicle.model_code} ${vehicle.engine_number} ${vehicle.chassis_number} ${vehicle.color} ${vehicle.price}`.toLowerCase().includes(q)
    );
  }, [query, vehicles]);

  const filteredSpares = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return spares;
    return spares.filter((spare) =>
      `${spare.model_code} ${spare.spare_code} ${spare.serial_number} ${spare.price}`.toLowerCase().includes(q)
    );
  }, [query, spares]);

  const cartCount = selectedBikeIds.size + cartSpares.size;
  const hasBike = selectedBikeIds.size > 0;

  function toggleBikeSelection(bikeId: string) {
    setSelectedBikeIds((current) => {
      const next = new Set(current);
      if (next.has(bikeId)) next.delete(bikeId);
      else next.add(bikeId);
      return next;
    });
  }

  function toggleSpareSelection(spareId: string) {
    setCartSpares((current) => {
      const next = new Set(current);
      if (next.has(spareId)) next.delete(spareId);
      else next.add(spareId);
      return next;
    });
  }

  async function handleSubmit() {
    if (!firstName || !lastName || !phone || cartCount === 0) return;

    setSubmitting(true);
    setSuccess(null);
    setErrorMessage(null);

    try {
      const items = [
        ...Array.from(selectedBikeIds).map((id) => ({ type: "Bike" as const, id })),
        ...Array.from(cartSpares).map((id) => ({ type: "Spare" as const, id })),
      ];

      const response = await fetch("/api/sales/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetCode,
          customer: {
            first_name: firstName,
            last_name: lastName,
            phone_number: phone,
            address: address || null,
            nic: nic || null,
          },
          items,
          payment: {
            base_price: moneyInputToNumber(basePrice),
            registration_fee: hasBike ? moneyInputToNumber(registrationFee) : 0,
            discount: moneyInputToNumber(discount),
            advance_payment: hasBike ? moneyInputToNumber(advancePayment) : 0,
            payment_method: paymentMethod,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to submit sale");

      setSuccess(data.saleId);
      setSelectedBikeIds(new Set());
      setCartSpares(new Set());
      setIsBasePriceManuallyEdited(false);
      setBasePrice("");
      setRegistrationFee("");
      setDiscount("");
      setAdvancePayment("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setAddress("");
      setNic("");
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handleBasePriceChange(value: string) {
    setIsBasePriceManuallyEdited(true);
    setBasePrice(sanitizeMoneyInput(value));
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Loading available inventory...</div>;
  }

  return (
    <div className="space-y-6">
      {success && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              Sale completed
            </CardTitle>
            <CardDescription className="text-emerald-700 dark:text-emerald-300">Sale ID: {success}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {errorMessage && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20">
          <CardHeader>
            <CardTitle className="text-red-800 dark:text-red-300">Action failed</CardTitle>
            <CardDescription className="text-red-700 dark:text-red-300">{errorMessage}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="dark:text-white">Available inventory</CardTitle>
            <CardDescription className="dark:text-slate-400">
              {filterCategory === "bikes" ? "Showing Vehicles (multiple allowed)" : "Showing Spare Parts (multiple allowed)"} - Search and add items to cart.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search model, engine, chassis, serial..."
              className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
            />

            <div className="space-y-2">
              {filterCategory === "bikes" ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Truck className="h-4 w-4" /> Vehicles (Multiple allowed)
                  </p>
                  <div className="max-h-[52vh] overflow-y-auto rounded-2xl border border-slate-200 p-2 dark:border-white/10">
                    {filteredVehicles.length === 0 ? (
                      <p className="p-3 text-sm text-slate-500 dark:text-slate-400">No vehicles available.</p>
                    ) : (
                      filteredVehicles.map((vehicle) => {
                        const selected = selectedBikeIds.has(vehicle.id);
                        return (
                          <button
                            key={vehicle.id}
                            type="button"
                            onClick={() => toggleBikeSelection(vehicle.id)}
                            className={`w-full rounded-xl border p-3 text-left transition-colors ${
                              selected
                                ? "border-sky-300 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10"
                                : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{vehicle.model_code}</p>
                              <Badge variant="outline">{selected ? "Selected" : "Tap to select"}</Badge>
                            </div>
                            <p className="mt-1 text-xs font-mono text-slate-600 dark:text-slate-300">ENG: {vehicle.engine_number}</p>
                            <p className="text-xs font-mono text-slate-600 dark:text-slate-300">CHS: {vehicle.chassis_number}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300">Color: {vehicle.color || "-"}</p>
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Price: Rs{vehicle.price?.toLocaleString() || "0"}</p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Wrench className="h-4 w-4" /> Spares (Multiple allowed)
                  </p>
                  <div className="max-h-[52vh] overflow-y-auto rounded-2xl border border-slate-200 p-2 dark:border-white/10">
                    {filteredSpares.length === 0 ? (
                      <p className="p-3 text-sm text-slate-500 dark:text-slate-400">No spares available.</p>
                    ) : (
                      filteredSpares.map((spare) => {
                        const selected = cartSpares.has(spare.id);
                        return (
                          <button
                            key={spare.id}
                            type="button"
                            onClick={() => toggleSpareSelection(spare.id)}
                            className={`w-full rounded-xl border p-3 text-left transition-colors ${
                              selected
                                ? "border-violet-300 bg-violet-50 dark:border-violet-500/30 dark:bg-violet-500/10"
                                : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{spare.spare_code}</p>
                              <Badge variant="outline">{selected ? "Selected" : "Tap to select"}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{spare.model_code}</p>
                            <p className="text-xs font-mono text-slate-600 dark:text-slate-300">SER: {spare.serial_number}</p>
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Price: Rs{spare.price?.toLocaleString() || "0"}</p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <ShoppingCart className="h-5 w-5" />
                Cart & Buyer
              </CardTitle>
              <CardDescription className="dark:text-slate-400">Complete the customer details and totals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-slate-800/30">
                <p className="font-semibold text-slate-900 dark:text-white">{cartCount} item(s) selected</p>
                {cartCount > 0 && (
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    <p>Selected items:</p>
                    <ul className="list-inside list-disc">
                      {Array.from(selectedBikeIds).map((bikeId) => {
                        const bike = vehicles.find((vehicle) => vehicle.id === bikeId);
                        return bike ? (
                          <li key={bikeId}>
                            Vehicle {bike.model_code} - Rs{bike.price?.toLocaleString()}
                            <button
                              onClick={() => toggleBikeSelection(bikeId)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </li>
                        ) : null;
                      })}
                      {Array.from(cartSpares).map((spareId) => {
                        const spare = spares.find((row) => row.id === spareId);
                        return spare ? (
                          <li key={spareId}>
                            Spare {spare.spare_code} - Rs{spare.price?.toLocaleString()}
                            <button
                              onClick={() => toggleSpareSelection(spareId)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(event) => setPhone(event.target.value)} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <Label>NIC (optional)</Label>
                  <Input value={nic} onChange={(event) => setNic(event.target.value)} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address (optional)</Label>
                  <Input value={address} onChange={(event) => setAddress(event.target.value)} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 dark:border-white/10">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Package className="h-4 w-4" /> Payment (manual)
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Base price</Label>
                    <Input
                      value={basePrice}
                      inputMode="decimal"
                      placeholder="0.00"
                      onChange={(event) => handleBasePriceChange(event.target.value)}
                      onBlur={() => setBasePrice(formatMoneyForInput(basePrice))}
                      className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                    />
                    {!isBasePriceManuallyEdited && cartCount > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Auto-calculated from selected items</p>
                    )}
                    {isBasePriceManuallyEdited && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">Manually edited (auto-update paused)</p>
                    )}
                  </div>

                  {hasBike && (
                    <>
                      <div className="space-y-2">
                        <Label>Registration fee</Label>
                        <Input
                          value={registrationFee}
                          inputMode="decimal"
                          placeholder="0.00"
                          onChange={(event) => setRegistrationFee(sanitizeMoneyInput(event.target.value))}
                          onBlur={() => setRegistrationFee(formatMoneyForInput(registrationFee))}
                          className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Advance</Label>
                        <Input
                          value={advancePayment}
                          inputMode="decimal"
                          placeholder="0.00"
                          onChange={(event) => setAdvancePayment(sanitizeMoneyInput(event.target.value))}
                          onBlur={() => setAdvancePayment(formatMoneyForInput(advancePayment))}
                          className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Discount</Label>
                    <Input
                      value={discount}
                      inputMode="decimal"
                      placeholder="0.00"
                      onChange={(event) => setDiscount(sanitizeMoneyInput(event.target.value))}
                      onBlur={() => setDiscount(formatMoneyForInput(discount))}
                      className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Input
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                      className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                    />
                  </div>
                </div>

                {cartSpares.size > 0 && !hasBike && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Note: Registration fee and advance payment are only applicable for vehicle purchases.
                  </p>
                )}
              </div>

              <Button disabled={submitting || cartCount === 0 || !firstName || !lastName || !phone} onClick={handleSubmit} className="w-full">
                {submitting ? "Processing..." : "Complete sale"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
