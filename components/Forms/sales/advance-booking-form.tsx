"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, CheckCircle2, FileText, Loader2, User } from "lucide-react";

import { formatMoneyForInput, moneyInputToNumber, sanitizeMoneyInput } from "@/components/Forms/sales/sales-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BuyerType = "customer" | "company";

type WarehouseModel = {
  model_code: string;
  model_name: string;
  price: number;
  warehouse_quantity: number;
};

type LocalVehicle = {
  id: string;
  model_code: string;
  engine_number: string;
  chassis_number: string;
  color: string | null;
  yom: string | null;
  version: string | null;
  price: number;
};

export default function AdvanceBookingForm({ buyerType }: { buyerType: BuyerType }) {
  const params = useParams();
  const dealerCode = (params.dealerCode as string | undefined) || "";
  const showroomCode = (params.showroomCode as string | undefined) || "";
  const targetType = dealerCode ? "dealer" : "showroom";
  const targetCode = dealerCode || showroomCode;

  const [models, setModels] = useState<WarehouseModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedModelCode, setSelectedModelCode] = useState<string>("");
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [localAvailability, setLocalAvailability] = useState<{
    available: boolean;
    count: number;
    vehicles: LocalVehicle[];
  } | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [nic, setNic] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyContact, setCompanyContact] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [brNo, setBrNo] = useState("");
  const [vatNo, setVatNo] = useState("");

  const [basePrice, setBasePrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [advancePayment, setAdvancePayment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Advance payment");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMessage(null);
      const response = await fetch("/api/sales/warehouse-models");
      const data = await response.json();
      if (response.ok) {
        setModels(data.models || []);
      } else {
        setErrorMessage(data.error || "Failed to load warehouse models");
      }
      setLoading(false);
    };

    void load();
  }, []);

  const filteredModels = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((model) =>
      `${model.model_code} ${model.model_name} ${model.price}`.toLowerCase().includes(q)
    );
  }, [models, query]);

  const selectedModel = models.find((model) => model.model_code === selectedModelCode) || null;

  useEffect(() => {
    if (selectedModel) {
      setBasePrice(formatMoneyForInput(String(selectedModel.price)));
    }
  }, [selectedModel]);

  useEffect(() => {
    const loadAvailability = async () => {
      if (!selectedModelCode) {
        setLocalAvailability(null);
        return;
      }

      setCheckingAvailability(true);
      try {
        const response = await fetch(
          `/api/sales/model-availability?targetType=${targetType}&targetCode=${encodeURIComponent(targetCode)}&modelCode=${encodeURIComponent(selectedModelCode)}`
        );
        const data = await response.json();
        if (response.ok) {
          setLocalAvailability({
            available: Boolean(data.available),
            count: Number(data.count || 0),
            vehicles: data.vehicles || [],
          });
        } else {
          setLocalAvailability({
            available: false,
            count: 0,
            vehicles: [],
          });
        }
      } catch {
        setLocalAvailability({
          available: false,
          count: 0,
          vehicles: [],
        });
      } finally {
        setCheckingAvailability(false);
      }
    };

    void loadAvailability();
  }, [selectedModelCode, targetCode, targetType]);

  async function handleSubmit() {
    if (!selectedModel) return;
    if (buyerType === "customer" && (!firstName || !lastName || !phone)) return;
    if (buyerType === "company" && (!companyName || !companyEmail)) return;

    setSubmitting(true);
    setErrorMessage(null);
    setSuccess(null);

    try {
      const endpoint = buyerType === "customer" ? "/api/sales/customer-advance" : "/api/sales/company-advance";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetCode,
          requestedModel: selectedModel,
          customer:
            buyerType === "customer"
              ? {
                  first_name: firstName,
                  last_name: lastName,
                  phone_number: phone,
                  address: customerAddress || null,
                  nic: nic || null,
                }
              : undefined,
          company:
            buyerType === "company"
              ? {
                  company_name: companyName,
                  company_email: companyEmail,
                  company_contact: companyContact || null,
                  address: companyAddress || null,
                  br_no: brNo || null,
                  vat_no: vatNo || null,
                }
              : undefined,
          payment: {
            base_price: moneyInputToNumber(basePrice),
            registration_fee: 0,
            discount: moneyInputToNumber(discount),
            advance_payment: moneyInputToNumber(advancePayment),
            payment_method: paymentMethod,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save advance booking");

      const booking = data.booking;
      const commonPayload = {
        id: booking.sale.id,
        created_at: booking.sale.created_at,
        target_type: targetType,
        target_code: targetCode,
        base_price: moneyInputToNumber(basePrice),
        registration_fee: 0,
        discount: moneyInputToNumber(discount),
        advance_payment: moneyInputToNumber(advancePayment),
        balance_due: Number(booking.sale.balance_due || 0),
        sale_stage: "advance",
        requested_model_code: selectedModel.model_code,
        requested_model_name: selectedModel.model_name,
        requested_price: selectedModel.price,
        items: [
          {
            type: "Bike" as const,
            model_code: selectedModel.model_code,
            identifier: "PRE-ORDER",
            price: selectedModel.price,
          },
        ],
      };

      if (buyerType === "customer") {
        const customerPayload = {
          ...commonPayload,
          customer_id: booking.buyerId,
          customer: {
            first_name: firstName,
            last_name: lastName,
            phone_number: phone,
            address: customerAddress || null,
            nic: nic || null,
          },
        };

        const generateInvoice = (await import("@/lib/utils/customer/customerInvoice")).default;
        const generateQuotation = (await import("@/lib/utils/customer/customerQuotation")).default;

        await generateInvoice({
          ...customerPayload,
          document_title: "PERFORMER INVOICE",
          document_label: "Performer Invoice No:",
          document_number_prefix: "PERFORMER-INV",
        });
        await generateQuotation({
          ...customerPayload,
          document_title: "PRE-ORDER QUOTA",
          document_label: "Pre-Order Ref No:",
          document_number_prefix: "PREORDER-QUOT",
        });
      } else {
        const companyPayload = {
          ...commonPayload,
          company_id: booking.buyerId,
          company: {
            company_name: companyName,
            company_email: companyEmail,
            company_contact: companyContact || null,
            address: companyAddress || null,
            br_no: brNo || null,
            vat_no: vatNo || null,
          },
        };

        const generateInvoice = (await import("@/lib/utils/company/companyInvoice")).default;
        const generateQuotation = (await import("@/lib/utils/company/companyQuotation")).default;

        await generateInvoice({
          ...companyPayload,
          document_title: "PERFORMER INVOICE",
          document_label: "Performer Invoice No:",
          document_number_prefix: "PERFORMER-INV",
        });
        await generateQuotation({
          ...companyPayload,
          document_title: "PRE-ORDER QUOTA",
          document_label: "Pre-Order Ref No:",
          document_number_prefix: "PREORDER-QUOT",
        });
      }

      setSuccess(booking.sale.id);
      setSelectedModelCode("");
      setQuery("");
      setBasePrice("");
      setDiscount("");
      setAdvancePayment("");
      if (buyerType === "customer") {
        setFirstName("");
        setLastName("");
        setPhone("");
        setNic("");
        setCustomerAddress("");
      } else {
        setCompanyName("");
        setCompanyEmail("");
        setCompanyContact("");
        setCompanyAddress("");
        setBrNo("");
        setVatNo("");
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Loading warehouse models...</div>;
  }

  return (
    <div className="space-y-6">
      {success ? (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              Advance booking saved
            </CardTitle>
            <CardDescription className="text-emerald-700 dark:text-emerald-300">
              Booking reference: {success}. Performer Invoice and Pre-Order Quotation were generated.
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle>Warehouse Models</CardTitle>
            <CardDescription>
              Select the requested bike model from warehouse stock. This stage does not assign a chassis or engine number.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search model code or name..."
              className="h-11 rounded-xl dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
            />
            <div className="max-h-[55vh] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-2 dark:border-white/10">
              {filteredModels.map((model) => {
                const selected = selectedModelCode === model.model_code;
                return (
                  <button
                    key={model.model_code}
                    type="button"
                    onClick={() => setSelectedModelCode(model.model_code)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-sky-300 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10"
                        : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{model.model_name}</p>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{model.model_code}</p>
                      </div>
                      <Badge variant="outline">{selected ? "Selected" : "Select"}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      Warehouse qty: {model.warehouse_quantity}
                    </p>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Price: Rs{model.price.toLocaleString()}
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {buyerType === "customer" ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
              Advance Booking
            </CardTitle>
            <CardDescription>Save the buyer details and generate the two pre-sale documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedModel ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800/30">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedModel.model_name}</p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{selectedModel.model_code}</p>
                  <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                    Rs{selectedModel.price.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/40">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {targetType === "dealer" ? "Dealer" : "Showroom"} availability
                  </p>
                  {checkingAvailability ? (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Checking local stock...</p>
                  ) : localAvailability?.available ? (
                    <>
                      <p className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {localAvailability.count} vehicle(s) currently available in this {targetType}
                      </p>
                      <div className="mt-2 space-y-2">
                        {localAvailability.vehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            className="rounded-md border border-slate-200 px-3 py-2 text-xs dark:border-white/10"
                          >
                            <p className="font-mono text-slate-700 dark:text-slate-300">ENG: {vehicle.engine_number}</p>
                            <p className="font-mono text-slate-700 dark:text-slate-300">CHS: {vehicle.chassis_number}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                      This model is not currently available in this {targetType}. No local vehicles to show yet.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                Select a warehouse model to continue.
              </div>
            )}

            {buyerType === "customer" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>NIC</Label>
                  <Input value={nic} onChange={(event) => setNic(event.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Input value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} />
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Company name</Label>
                  <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Company email</Label>
                  <Input value={companyEmail} onChange={(event) => setCompanyEmail(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Company contact</Label>
                  <Input value={companyContact} onChange={(event) => setCompanyContact(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={companyAddress} onChange={(event) => setCompanyAddress(event.target.value)} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>BR No</Label>
                    <Input value={brNo} onChange={(event) => setBrNo(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>VAT No</Label>
                    <Input value={vatNo} onChange={(event) => setVatNo(event.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 pt-4 dark:border-white/10">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <FileText className="h-4 w-4" />
                Advance Payment
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quoted price</Label>
                  <Input value={basePrice} onChange={(event) => setBasePrice(sanitizeMoneyInput(event.target.value))} onBlur={() => setBasePrice(formatMoneyForInput(basePrice))} />
                </div>
                <div className="space-y-2">
                  <Label>Advance received</Label>
                  <Input value={advancePayment} onChange={(event) => setAdvancePayment(sanitizeMoneyInput(event.target.value))} onBlur={() => setAdvancePayment(formatMoneyForInput(advancePayment))} />
                </div>
                <div className="space-y-2">
                  <Label>Discount</Label>
                  <Input value={discount} onChange={(event) => setDiscount(sanitizeMoneyInput(event.target.value))} onBlur={() => setDiscount(formatMoneyForInput(discount))} />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Input value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} />
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={
                submitting ||
                !selectedModel ||
                (buyerType === "customer" ? !firstName || !lastName || !phone : !companyName || !companyEmail)
              }
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving booking...
                </>
              ) : (
                "Save Advance Booking"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
