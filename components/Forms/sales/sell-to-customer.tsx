"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, Package, ShoppingCart, Truck, Wrench } from "lucide-react";
import QRCode from "qrcode";
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
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [cartSpares, setCartSpares] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // customer fields (minimal)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [nic, setNic] = useState("");

  // payment fields
  const [basePrice, setBasePrice] = useState<string>("");
  const [registrationFee, setRegistrationFee] = useState<string>("");
  const [discount, setDiscount] = useState<string>("");
  const [advancePayment, setAdvancePayment] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  
  // Add a flag to track if base price was manually edited
  const [isBasePriceManuallyEdited, setIsBasePriceManuallyEdited] = useState(false);
 
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setSuccess(null);
      setErrorMessage(null);
      const res = await fetch(`/api/sales/inventory?targetType=${targetType}&targetCode=${encodeURIComponent(targetCode)}`);
      const data = await res.json();
      if (res.ok) {
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

  // Calculate total price of selected items
  const calculateTotalPrice = () => {
    let total = 0;
    
    // Add selected bike price
    if (selectedBikeId) {
      const bike = vehicles.find(v => v.id === selectedBikeId);
      if (bike && bike.price) {
        total += bike.price;
      }
    }
    
    // Sum selected spare prices
    cartSpares.forEach(spareId => {
      const spare = spares.find(s => s.id === spareId);
      if (spare && spare.price) {
        total += spare.price;
      }
    });
    
    return total;
  };

  // Auto-update base price when cart changes (only if not manually edited)
  useEffect(() => {
    if (!isBasePriceManuallyEdited) {
      const total = calculateTotalPrice();
      setBasePrice(formatMoneyForInput(total.toString()));
    }
  }, [selectedBikeId, cartSpares, vehicles, spares, isBasePriceManuallyEdited]);

  // Reset manual edit flag when cart becomes empty
  useEffect(() => {
    if (!selectedBikeId && cartSpares.size === 0) {
      setIsBasePriceManuallyEdited(false);
    }
  }, [selectedBikeId, cartSpares]);

  // Reset registration fee and advance payment when bike is deselected
  useEffect(() => {
    if (!selectedBikeId) {
      setRegistrationFee("");
      setAdvancePayment("");
    }
  }, [selectedBikeId]);

  const handleBikeSelection = (bikeId: string) => {
    if (selectedBikeId === bikeId) {
      // Deselect if already selected
      setSelectedBikeId(null);
    } else {
      // Select new bike (replaces any existing selection)
      setSelectedBikeId(bikeId);
    }
  };

  const filteredVehicles = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = vehicles;
    if (!q) return filtered;
    return filtered.filter((v) => `${v.model_code} ${v.engine_number} ${v.chassis_number} ${v.color} ${v.price}`.toLowerCase().includes(q));
  }, [vehicles, query]);

  const filteredSpares = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = spares;
    if (!q) return filtered;
    return filtered.filter((s) => `${s.model_code} ${s.spare_code} ${s.serial_number} ${s.price}`.toLowerCase().includes(q));
  }, [spares, query]);

  const cartCount = (selectedBikeId ? 1 : 0) + cartSpares.size;
  const hasBike = selectedBikeId !== null;

  const handleSubmit = async () => {
    if (!firstName || !lastName || !phone || cartCount === 0) return;
    setSubmitting(true);
    setSuccess(null);
    setErrorMessage(null);
    try {
      const items = [
        ...(selectedBikeId ? [{ type: "Bike" as const, id: selectedBikeId }] : []),
        ...Array.from(cartSpares).map((id) => ({ type: "Spare" as const, id })),
      ];
      const res = await fetch("/api/sales/customer", {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit sale");

      setSuccess(data.saleId);
      setSelectedBikeId(null);
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle manual base price change
  const handleBasePriceChange = (value: string) => {
    setIsBasePriceManuallyEdited(true);
    setBasePrice(sanitizeMoneyInput(value));
  };

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
              {filterCategory === "bikes" ? "Showing Vehicles (max 1 per sale)" : "Showing Spare Parts (multiple allowed)"} - Search and add items to cart.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search model, engine, chassis, serial..."
              className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
            />

            <div className="space-y-2">
              {filterCategory === "bikes" ? (
                <>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Vehicles (Maximum 1 per sale)
                  </p>
                  <div className="max-h-[52vh] overflow-y-auto rounded-2xl border border-slate-200 p-2 dark:border-white/10">
                    {filteredVehicles.length === 0 ? (
                      <p className="p-3 text-sm text-slate-500 dark:text-slate-400">No vehicles available.</p>
                    ) : (
                      filteredVehicles.map((v) => {
                        const selected = selectedBikeId === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleBikeSelection(v.id)}
                            className={`w-full rounded-xl border p-3 text-left transition-colors ${
                              selected
                                ? "border-sky-300 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10"
                                : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{v.model_code}</p>
                              <Badge variant="outline">{selected ? "Selected" : "Tap to select"}</Badge>
                            </div>
                            <p className="mt-1 text-xs font-mono text-slate-600 dark:text-slate-300">ENG: {v.engine_number}</p>
                            <p className="text-xs font-mono text-slate-600 dark:text-slate-300">CHS: {v.chassis_number}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300">Color: {v.color || "-"}</p>
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Price: Rs{v.price?.toLocaleString() || "0"}</p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Wrench className="h-4 w-4" /> Spares (Multiple allowed)
                  </p>
                  <div className="max-h-[52vh] overflow-y-auto rounded-2xl border border-slate-200 p-2 dark:border-white/10">
                    {filteredSpares.length === 0 ? (
                      <p className="p-3 text-sm text-slate-500 dark:text-slate-400">No spares available.</p>
                    ) : (
                      filteredSpares.map((s) => {
                        const selected = cartSpares.has(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setCartSpares((prev) => {
                                const next = new Set(prev);
                                if (next.has(s.id)) next.delete(s.id);
                                else next.add(s.id);
                                return next;
                              });
                            }}
                            className={`w-full rounded-xl border p-3 text-left transition-colors ${
                              selected
                                ? "border-violet-300 bg-violet-50 dark:border-violet-500/30 dark:bg-violet-500/10"
                                : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.spare_code}</p>
                              <Badge variant="outline">{selected ? "Selected" : "Tap to select"}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{s.model_code}</p>
                            <p className="text-xs font-mono text-slate-600 dark:text-slate-300">SER: {s.serial_number}</p>
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Price: Rs{s.price?.toLocaleString() || "0"}</p>
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
                      {selectedBikeId && (() => {
                        const bike = vehicles.find(v => v.id === selectedBikeId);
                        return bike && (
                          <li key={selectedBikeId}>
                            🚗 {bike.model_code} - Rs{bike.price?.toLocaleString()}
                            <button
                              onClick={() => setSelectedBikeId(null)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </li>
                        );
                      })()}
                      {Array.from(cartSpares).map(spareId => {
                        const spare = spares.find(s => s.id === spareId);
                        return spare && (
                          <li key={spareId}>
                            🔧 {spare.spare_code} - Rs{spare.price?.toLocaleString()}
                            <button
                              onClick={() => {
                                setCartSpares(prev => {
                                  const next = new Set(prev);
                                  next.delete(spareId);
                                  return next;
                                });
                              }}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <Label>NIC (optional)</Label>
                  <Input value={nic} onChange={(e) => setNic(e.target.value)} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address (optional)</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 dark:border-white/10">
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="h-4 w-4" /> Payment (manual)
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Base price</Label>
                    <Input 
                      value={basePrice} 
                      inputMode="decimal" 
                      placeholder="0.00" 
                      onChange={(e) => handleBasePriceChange(e.target.value)} 
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
                  
                  {/* Only show Registration Fee and Advance Payment if a bike is selected */}
                  {hasBike && (
                    <>
                      <div className="space-y-2">
                        <Label>Registration fee</Label>
                        <Input 
                          value={registrationFee} 
                          inputMode="decimal" 
                          placeholder="0.00" 
                          onChange={(e) => setRegistrationFee(sanitizeMoneyInput(e.target.value))} 
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
                          onChange={(e) => setAdvancePayment(sanitizeMoneyInput(e.target.value))} 
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
                      onChange={(e) => setDiscount(sanitizeMoneyInput(e.target.value))} 
                      onBlur={() => setDiscount(formatMoneyForInput(discount))} 
                      className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Input 
                      value={paymentMethod} 
                      onChange={(e) => setPaymentMethod(e.target.value)} 
                      className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" 
                    />
                  </div>
                </div>
                
                {/* Show message when only spares are selected */}
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