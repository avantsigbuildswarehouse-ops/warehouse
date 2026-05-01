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

export default function SellToCustomerForm() {
  const params = useParams();
  const dealerCode = (params.dealerCode as string | undefined) || "";
  const showroomCode = (params.showroomCode as string | undefined) || "";

  const targetType = dealerCode ? "dealer" : "showroom";
  const targetCode = dealerCode || showroomCode;

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [spares, setSpares] = useState<SpareRow[]>([]);
  const [query, setQuery] = useState("");
  const [cartBikes, setCartBikes] = useState<Set<string>>(new Set());
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
  const [vat, setVat] = useState<string>("");
  const [registrationFee, setRegistrationFee] = useState<string>("");
  const [discount, setDiscount] = useState<string>("");
  const [advancePayment, setAdvancePayment] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [warrantyQr, setWarrantyQr] = useState<Array<{ id: string; label: string; url: string }>>([]);

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

  const filteredVehicles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => `${v.model_code} ${v.engine_number} ${v.chassis_number}`.toLowerCase().includes(q));
  }, [vehicles, query]);

  const filteredSpares = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return spares;
    return spares.filter((s) => `${s.model_code} ${s.spare_code} ${s.serial_number}`.toLowerCase().includes(q));
  }, [spares, query]);

  const cartCount = cartBikes.size + cartSpares.size;

  const handleSubmit = async () => {
    if (!firstName || !lastName || !phone || cartCount === 0) return;
    setSubmitting(true);
    setSuccess(null);
    setErrorMessage(null);
    try {
      const items = [
        ...Array.from(cartBikes).map((id) => ({ type: "Bike" as const, id })),
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
            vat: moneyInputToNumber(vat),
            registration_fee: moneyInputToNumber(registrationFee),
            discount: moneyInputToNumber(discount),
            advance_payment: moneyInputToNumber(advancePayment),
            payment_method: paymentMethod,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit sale");

      setSuccess(data.saleId);
      setCartBikes(new Set());
      setCartSpares(new Set());
      const qrRows = ((data.bikeWarrantyQr || []) as Array<{ inventoryId: string; engine_number: string | null; chassis_number: string | null; warranty_url: string }>);
      const qrCodes = await Promise.all(
        qrRows.map(async (row) => ({
          id: row.inventoryId,
          label: `${row.engine_number || "-"} / ${row.chassis_number || "-"}`,
          url: await QRCode.toDataURL(new URL(row.warranty_url, window.location.origin).toString()),
        }))
      );
      setWarrantyQr(qrCodes);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Loading available inventory...</div>;
  }

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <Badge variant="outline" className="w-fit">Sales</Badge>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Sell to Customer</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Select from {targetType} inventory ({targetCode}) and complete the sale.
          </p>
        </div>

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
              <CardDescription className="dark:text-slate-400">Search and add items to cart.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search model, engine, chassis, serial..."
                className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Vehicles
                  </p>
                  <div className="max-h-[52vh] overflow-y-auto rounded-2xl border border-slate-200 p-2 dark:border-white/10">
                    {filteredVehicles.length === 0 ? (
                      <p className="p-3 text-sm text-slate-500 dark:text-slate-400">No vehicles available.</p>
                    ) : (
                      filteredVehicles.map((v) => {
                        const selected = cartBikes.has(v.id);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setCartBikes((prev) => {
                                const next = new Set(prev);
                                if (next.has(v.id)) next.delete(v.id);
                                else next.add(v.id);
                                return next;
                              });
                            }}
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
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Wrench className="h-4 w-4" /> Spares
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
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
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
                      <Input value={basePrice} inputMode="decimal" placeholder="0.00" onChange={(e) => setBasePrice(sanitizeMoneyInput(e.target.value))} onBlur={() => setBasePrice(formatMoneyForInput(basePrice))} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>VAT</Label>
                      <Input value={vat} inputMode="decimal" placeholder="0.00" onChange={(e) => setVat(sanitizeMoneyInput(e.target.value))} onBlur={() => setVat(formatMoneyForInput(vat))} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>Registration fee</Label>
                      <Input value={registrationFee} inputMode="decimal" placeholder="0.00" onChange={(e) => setRegistrationFee(sanitizeMoneyInput(e.target.value))} onBlur={() => setRegistrationFee(formatMoneyForInput(registrationFee))} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>Discount</Label>
                      <Input value={discount} inputMode="decimal" placeholder="0.00" onChange={(e) => setDiscount(sanitizeMoneyInput(e.target.value))} onBlur={() => setDiscount(formatMoneyForInput(discount))} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>Advance</Label>
                      <Input value={advancePayment} inputMode="decimal" placeholder="0.00" onChange={(e) => setAdvancePayment(sanitizeMoneyInput(e.target.value))} onBlur={() => setAdvancePayment(formatMoneyForInput(advancePayment))} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>Method</Label>
                      <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white" />
                    </div>
                  </div>
                </div>

                <Button disabled={submitting || cartCount === 0 || !firstName || !lastName || !phone} onClick={handleSubmit} className="w-full">
                  {submitting ? "Processing..." : "Complete sale"}
                </Button>

                {warrantyQr.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-white/10">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Warranty QR (bikes only)</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {warrantyQr.map((qr) => (
                        <div key={qr.id} className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                          <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">{qr.label}</p>
                          <Image src={qr.url} alt={`Warranty QR ${qr.label}`} width={144} height={144} className="h-36 w-36 rounded bg-white p-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

