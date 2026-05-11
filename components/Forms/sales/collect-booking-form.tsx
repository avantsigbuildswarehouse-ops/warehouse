"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, Search, Truck } from "lucide-react";

import { formatMoneyForInput, moneyInputToNumber, sanitizeMoneyInput } from "@/components/Forms/sales/sales-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BuyerType = "customer" | "company";

type AvailableVehicle = {
  id: string;
  model_code: string;
  engine_number: string;
  chassis_number: string;
  color: string | null;
  yom: string | null;
  version: string | null;
  price: number;
};

type RequestedVehicleItem = {
  model_code: string;
  model_name: string;
  price: number;
  quantity: number;
};

type BookingResponse = {
  sale: {
    id: string;
    base_price: number;
    registration_fee: number;
    discount: number;
    advance_payment: number;
    balance_due: number;
    payment_method: string;
    total: number;
  };
  documentNumber: string;
  requestedModel: {
    model_code: string;
    model_name: string;
    price: number;
  };
  requestedItems: RequestedVehicleItem[];
  buyer: Record<string, unknown>;
  alreadyCollected: boolean;
  availableVehicles: AvailableVehicle[];
};

export default function CollectBookingForm({ buyerType }: { buyerType: BuyerType }) {
  const params = useParams();
  const dealerCode = (params.dealerCode as string | undefined) || "";
  const showroomCode = (params.showroomCode as string | undefined) || "";
  const targetType = dealerCode ? "dealer" : "showroom";
  const targetCode = dealerCode || showroomCode;

  const [documentSuffix, setDocumentSuffix] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [basePrice, setBasePrice] = useState("");
  const [registrationFee, setRegistrationFee] = useState("");
  const [discount, setDiscount] = useState("");
  const [advancePayment, setAdvancePayment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Advance payment");

  const requestedItems = booking?.requestedItems?.length
    ? booking.requestedItems
    : booking?.requestedModel
      ? [{ ...booking.requestedModel, quantity: 1 }]
      : [];

  const availableVehiclesByModel = useMemo(() => {
    const groups = new Map<string, AvailableVehicle[]>();

    for (const vehicle of booking?.availableVehicles || []) {
      const current = groups.get(vehicle.model_code) || [];
      current.push(vehicle);
      groups.set(vehicle.model_code, current);
    }

    return groups;
  }, [booking]);

  const selectedVehicles = useMemo(() => {
    const selectedSet = new Set(selectedVehicleIds);
    return (booking?.availableVehicles || []).filter((vehicle) => selectedSet.has(vehicle.id));
  }, [booking, selectedVehicleIds]);

  const selectedCountsByModel = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vehicle of selectedVehicles) {
      counts.set(vehicle.model_code, (counts.get(vehicle.model_code) || 0) + 1);
    }
    return counts;
  }, [selectedVehicles]);

  const expectedVehicleCount = requestedItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (!booking) return;
    setBasePrice(formatMoneyForInput(String(booking.sale.base_price || 0)));
    setRegistrationFee(formatMoneyForInput(String(booking.sale.registration_fee || 0)));
    setDiscount(formatMoneyForInput(String(booking.sale.discount || 0)));
    setAdvancePayment(formatMoneyForInput(String(booking.sale.advance_payment || 0)));
    setPaymentMethod(booking.sale.payment_method || "Advance payment");
  }, [booking]);

  useEffect(() => {
    if (selectedVehicles.length === 0) return;
    const total = selectedVehicles.reduce((sum, vehicle) => sum + vehicle.price, 0);
    setBasePrice(formatMoneyForInput(String(total)));
  }, [selectedVehicles]);

  const summary = useMemo(() => {
    const base = moneyInputToNumber(basePrice);
    const reg = moneyInputToNumber(registrationFee);
    const disc = moneyInputToNumber(discount);
    const adv = moneyInputToNumber(advancePayment);
    const total = base + reg - disc;
    return {
      total,
      balance: total - adv,
    };
  }, [advancePayment, basePrice, discount, registrationFee]);

  function toggleVehicleSelection(vehicle: AvailableVehicle, requiredQuantity: number) {
    setSelectedVehicleIds((current) => {
      const exists = current.includes(vehicle.id);
      if (exists) {
        return current.filter((id) => id !== vehicle.id);
      }

      const selectedForModel = selectedCountsByModel.get(vehicle.model_code) || 0;
      if (selectedForModel >= requiredQuantity) {
        return current;
      }

      return [...current, vehicle.id];
    });
  }

  async function searchBooking() {
    if (documentSuffix.trim().length < 3) return;
    setLoading(true);
    setErrorMessage(null);
    setSuccess(null);
    setBooking(null);
    setSelectedVehicleIds([]);

    try {
      const endpoint = buyerType === "customer" ? "/api/sales/customer-advance" : "/api/sales/company-advance";
      const response = await fetch(
        `${endpoint}?documentSuffix=${encodeURIComponent(documentSuffix.trim())}&targetType=${targetType}&targetCode=${encodeURIComponent(targetCode)}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to find booking");
      setBooking(data.booking);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCollect() {
    if (!booking || selectedVehicleIds.length !== expectedVehicleCount) return;

    setSubmitting(true);
    setErrorMessage(null);
    setSuccess(null);

    try {
      const endpoint = buyerType === "customer" ? "/api/sales/customer-collect" : "/api/sales/company-collect";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetCode,
          saleId: booking.sale.id,
          vehicleIds: selectedVehicleIds,
          payment: {
            base_price: moneyInputToNumber(basePrice),
            registration_fee: moneyInputToNumber(registrationFee),
            discount: moneyInputToNumber(discount),
            advance_payment: moneyInputToNumber(advancePayment),
            payment_method: paymentMethod,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to complete collection");

      setSuccess(data.result.sale.id);
      setBooking(null);
      setSelectedVehicleIds([]);
      setDocumentSuffix("");
      setBasePrice("");
      setRegistrationFee("");
      setDiscount("");
      setAdvancePayment("");
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {success ? (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              Vehicles assigned successfully
            </CardTitle>
            <CardDescription className="text-emerald-700 dark:text-emerald-300">
              Final sale completed under sale ID: {success}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20">
          <CardHeader>
            <CardTitle className="text-red-800 dark:text-red-300">Action failed</CardTitle>
            <CardDescription className="text-red-700 dark:text-red-300">{errorMessage}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
        <CardHeader>
          <CardTitle>Came To Collect</CardTitle>
          <CardDescription>
            Search by the last digits of the performer invoice document number, then assign the exact set of real vehicles from the current {targetType} inventory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={documentSuffix}
              onChange={(event) => setDocumentSuffix(event.target.value)}
              placeholder="Enter last 5 digits of document number"
              className="h-11"
            />
            <Button onClick={searchBooking} disabled={loading || documentSuffix.trim().length < 3}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {booking ? (
            <div className="space-y-4">
              <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3 dark:border-white/10 dark:bg-slate-800/30">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Booking</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{booking.documentNumber}</p>
                  {booking.alreadyCollected ? (
                    <p className="text-xs text-red-600 dark:text-red-400">Already collected</p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Requested vehicles</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{requestedItems.length} model(s)</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{expectedVehicleCount} vehicle(s) total</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Advance Saved</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Rs{Number(booking.sale.advance_payment || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {requestedItems.map((item) => {
                  const availableVehicles = availableVehiclesByModel.get(item.model_code) || [];
                  const selectedCount = selectedCountsByModel.get(item.model_code) || 0;

                  return (
                    <div key={item.model_code} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                          <Truck className="h-4 w-4" />
                          {item.model_name}
                        </p>
                        <Badge variant="outline">
                          Select {item.quantity} | Selected {selectedCount}
                        </Badge>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800/30">
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{item.model_code}</p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          Requested quantity: {item.quantity} | Available now: {availableVehicles.length}
                        </p>
                      </div>

                      <div className="max-h-[32vh] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-2 dark:border-white/10">
                        {availableVehicles.length === 0 ? (
                          <p className="p-3 text-sm text-slate-500 dark:text-slate-400">
                            No available vehicles for {item.model_code} in this {targetType}.
                          </p>
                        ) : (
                          availableVehicles.map((vehicle) => {
                            const selected = selectedVehicleIds.includes(vehicle.id);
                            const selectionLocked = !selected && selectedCount >= item.quantity;

                            return (
                              <button
                                key={vehicle.id}
                                type="button"
                                onClick={() => toggleVehicleSelection(vehicle, item.quantity)}
                                disabled={selectionLocked}
                                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                                  selected
                                    ? "border-sky-300 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10"
                                    : "border-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/[0.03]"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{vehicle.model_code}</p>
                                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                      ENG: {vehicle.engine_number}
                                    </p>
                                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                      CHS: {vehicle.chassis_number}
                                    </p>
                                  </div>
                                  <Badge variant="outline">{selected ? "Selected" : "Select"}</Badge>
                                </div>
                                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                                  {vehicle.color || "-"} {vehicle.version ? `• ${vehicle.version}` : ""} {vehicle.yom ? `• ${vehicle.yom}` : ""}
                                </p>
                                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  Price: Rs{vehicle.price.toLocaleString()}
                                </p>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Base price</Label>
                  <Input value={basePrice} onChange={(event) => setBasePrice(sanitizeMoneyInput(event.target.value))} onBlur={() => setBasePrice(formatMoneyForInput(basePrice))} />
                </div>
                <div className="space-y-2">
                  <Label>Registration fee</Label>
                  <Input value={registrationFee} onChange={(event) => setRegistrationFee(sanitizeMoneyInput(event.target.value))} onBlur={() => setRegistrationFee(formatMoneyForInput(registrationFee))} />
                </div>
                <div className="space-y-2">
                  <Label>Discount</Label>
                  <Input value={discount} onChange={(event) => setDiscount(sanitizeMoneyInput(event.target.value))} onBlur={() => setDiscount(formatMoneyForInput(discount))} />
                </div>
                <div className="space-y-2">
                  <Label>Advance payment</Label>
                  <Input value={advancePayment} onChange={(event) => setAdvancePayment(sanitizeMoneyInput(event.target.value))} onBlur={() => setAdvancePayment(formatMoneyForInput(advancePayment))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Payment method</Label>
                  <Input value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-slate-800/30">
                <p className="font-semibold text-slate-900 dark:text-white">Final Summary</p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">Total: Rs{summary.total.toLocaleString()}</p>
                <p className="text-slate-600 dark:text-slate-300">Balance after advance: Rs{summary.balance.toLocaleString()}</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Selected vehicles: {selectedVehicleIds.length} / {expectedVehicleCount}
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleCollect}
                disabled={submitting || booking.alreadyCollected || selectedVehicleIds.length !== expectedVehicleCount}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing sale...
                  </>
                ) : (
                  "Assign Vehicles And Complete Sale"
                )}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
