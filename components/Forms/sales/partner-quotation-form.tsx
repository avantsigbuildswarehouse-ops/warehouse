"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, FileText, Trash2 } from "lucide-react";

import { formatMoneyForInput, moneyInputToNumber, sanitizeMoneyInput } from "@/components/Forms/sales/sales-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { generatePartnerPerformerInvoicePdf, generatePartnerQuotationPdf, type PartnerQuotationItem } from "@/lib/utils/sales/partner-quotation-documents";

type WarehouseModel = {
  model_code: string;
  model_name: string;
  price: number;
  warehouse_quantity: number;
};

type InventoryVehicle = {
  id: string;
  model_code: string;
  color: string | null;
};

type InventorySpare = {
  id: string;
  model_code: string;
  spare_code: string;
  serial_number: string;
  price: number | null;
};

type VehicleLine = {
  model_code: string;
  quantity: number;
};

type SpareLine = {
  key: string;
  quantity: number;
};

type SpareOption = {
  key: string;
  model_code: string;
  spare_code: string;
  unit_price: number;
  available_quantity: number;
};

export default function PartnerQuotationForm() {
  const params = useParams();
  const dealerCode = (params.dealerCode as string | undefined) || "";
  const showroomCode = (params.showroomCode as string | undefined) || "";
  const targetType = dealerCode ? "dealer" : "showroom";
  const targetCode = dealerCode || showroomCode;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelQuery, setModelQuery] = useState("");
  const [spareQuery, setSpareQuery] = useState("");
  const [models, setModels] = useState<WarehouseModel[]>([]);
  const [inventoryVehicles, setInventoryVehicles] = useState<InventoryVehicle[]>([]);
  const [spareOptions, setSpareOptions] = useState<SpareOption[]>([]);
  const [vehicleLines, setVehicleLines] = useState<VehicleLine[]>([]);
  const [spareLines, setSpareLines] = useState<SpareLine[]>([]);
  const [registrationFee, setRegistrationFee] = useState("");
  const [advancePayment, setAdvancePayment] = useState("");
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Advance payment");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [modelsResponse, inventoryResponse] = await Promise.all([
          fetch("/api/sales/warehouse-models"),
          fetch(`/api/sales/inventory?targetType=${targetType}&targetCode=${encodeURIComponent(targetCode)}`),
        ]);

        const [modelsData, inventoryData] = await Promise.all([
          modelsResponse.json(),
          inventoryResponse.json(),
        ]);

        if (!modelsResponse.ok) {
          throw new Error(modelsData.error || "Failed to load vehicle models");
        }
        if (!inventoryResponse.ok) {
          throw new Error(inventoryData.error || "Failed to load partner inventory");
        }

        const groupedSpares = new Map<string, SpareOption>();
        for (const spare of (inventoryData.spares || []) as InventorySpare[]) {
          const key = `${spare.model_code}::${spare.spare_code}`;
          const current = groupedSpares.get(key);
          if (current) {
            current.available_quantity += 1;
          } else {
            groupedSpares.set(key, {
              key,
              model_code: spare.model_code,
              spare_code: spare.spare_code,
              unit_price: Number(spare.price || 0),
              available_quantity: 1,
            });
          }
        }

        setModels(modelsData.models || []);
        setInventoryVehicles((inventoryData.vehicles || []).map((vehicle: { id: string; model_code: string; color: string | null }) => ({
          id: vehicle.id,
          model_code: vehicle.model_code,
          color: vehicle.color,
        })));
        setSpareOptions(Array.from(groupedSpares.values()).sort((a, b) => a.spare_code.localeCompare(b.spare_code)));
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load quotation data");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [targetCode, targetType]);

  const vehicleAvailability = useMemo(() => {
    const summary = new Map<string, { count: number; colors: string[] }>();
    for (const vehicle of inventoryVehicles) {
      const current = summary.get(vehicle.model_code) || { count: 0, colors: [] };
      current.count += 1;
      if (vehicle.color && !current.colors.includes(vehicle.color)) {
        current.colors.push(vehicle.color);
      }
      summary.set(vehicle.model_code, current);
    }
    return summary;
  }, [inventoryVehicles]);

  const filteredModels = useMemo(() => {
    const q = modelQuery.trim().toLowerCase();
    if (!q) return models;
    return models.filter((model) =>
      `${model.model_code} ${model.model_name} ${model.price}`.toLowerCase().includes(q)
    );
  }, [modelQuery, models]);

  const filteredSpares = useMemo(() => {
    const q = spareQuery.trim().toLowerCase();
    if (!q) return spareOptions;
    return spareOptions.filter((spare) =>
      `${spare.model_code} ${spare.spare_code} ${spare.unit_price}`.toLowerCase().includes(q)
    );
  }, [spareOptions, spareQuery]);

  const vehicleDetails = useMemo(
    () =>
      vehicleLines
        .map((line) => {
          const model = models.find((entry) => entry.model_code === line.model_code);
          if (!model) return null;
          const availability = vehicleAvailability.get(line.model_code);
          return {
            ...line,
            model_name: model.model_name,
            unit_price: model.price,
            available_count: availability?.count || 0,
            colors: availability?.colors || [],
          };
        })
        .filter(Boolean) as Array<
        VehicleLine & {
          model_name: string;
          unit_price: number;
          available_count: number;
          colors: string[];
        }
      >,
    [models, vehicleAvailability, vehicleLines]
  );

  const spareDetails = useMemo(
    () =>
      spareLines
        .map((line) => {
          const option = spareOptions.find((entry) => entry.key === line.key);
          if (!option) return null;
          return {
            ...line,
            ...option,
          };
        })
        .filter(Boolean) as Array<SpareLine & SpareOption>,
    [spareLines, spareOptions]
  );

  const basePrice = useMemo(() => {
    const vehicleTotal = vehicleDetails.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const spareTotal = spareDetails.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    return vehicleTotal + spareTotal;
  }, [spareDetails, vehicleDetails]);

  function addVehicleModel(modelCode: string) {
    setVehicleLines((current) => {
      const existing = current.find((line) => line.model_code === modelCode);
      if (existing) {
        return current.map((line) =>
          line.model_code === modelCode ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [...current, { model_code: modelCode, quantity: 1 }];
    });
  }

  function addSpareOption(key: string) {
    setSpareLines((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [...current, { key, quantity: 1 }];
    });
  }

  function updateVehicleQuantity(modelCode: string, quantity: string) {
    const nextQuantity = Math.max(1, Math.trunc(Number(quantity) || 1));
    setVehicleLines((current) =>
      current.map((line) => (line.model_code === modelCode ? { ...line, quantity: nextQuantity } : line))
    );
  }

  function updateSpareQuantity(key: string, quantity: string) {
    const nextQuantity = Math.max(1, Math.trunc(Number(quantity) || 1));
    setSpareLines((current) =>
      current.map((line) => (line.key === key ? { ...line, quantity: nextQuantity } : line))
    );
  }

  const totalItems = vehicleDetails.length + spareDetails.length;

  async function handleGenerate() {
    if (totalItems === 0) return;

    setSubmitting(true);
    setErrorMessage(null);
    setSuccess(null);

    try {
      const items: PartnerQuotationItem[] = [
        ...vehicleDetails.map((item) => ({
          type: "Bike" as const,
          model_code: item.model_code,
          description: `Requested quantity ${item.quantity}. Available colors: ${item.colors.length ? item.colors.join(", ") : "None currently available"}`,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.quantity * item.unit_price,
        })),
        ...spareDetails.map((item) => ({
          type: "Spare" as const,
          model_code: `${item.model_code} / ${item.spare_code}`,
          description: `Requested quantity ${item.quantity}. Available quantity now: ${item.available_quantity}`,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.quantity * item.unit_price,
        })),
      ];

      const payload = {
        targetType,
        targetCode,
        items,
        basePrice,
        registrationFee: moneyInputToNumber(registrationFee),
        advancePayment: moneyInputToNumber(advancePayment),
        discount: moneyInputToNumber(discount),
        paymentMethod,
      } as const;

      await generatePartnerQuotationPdf(payload);
      await generatePartnerPerformerInvoicePdf(payload);

      setSuccess("Quotation and performer invoice downloaded.");
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to generate documents");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Loading quotation workspace...</div>;
  }

  return (
    <div className="space-y-6">
      {success ? (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              Documents generated
            </CardTitle>
            <CardDescription className="text-emerald-700 dark:text-emerald-300">{success}</CardDescription>
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="space-y-6">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <CardHeader>
              <CardTitle>Vehicle Models</CardTitle>
              <CardDescription>Add requested vehicle models and quantities. Prices come from the vehicle model list.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={modelQuery}
                onChange={(event) => setModelQuery(event.target.value)}
                placeholder="Search model code or name..."
              />
              <div className="max-h-[36vh] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-2 dark:border-white/10">
                {filteredModels.map((model) => {
                  const availability = vehicleAvailability.get(model.model_code);
                  return (
                    <button
                      key={model.model_code}
                      type="button"
                      onClick={() => addVehicleModel(model.model_code)}
                      className="w-full rounded-xl border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{model.model_name}</p>
                          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{model.model_code}</p>
                        </div>
                        <Badge variant="outline">Add</Badge>
                      </div>
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Local availability: {availability?.count || 0}</p>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Price: Rs{model.price.toLocaleString()}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <CardHeader>
              <CardTitle>Spares</CardTitle>
              <CardDescription>Add requested spare groups and quantities from current dealer/showroom stock.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={spareQuery}
                onChange={(event) => setSpareQuery(event.target.value)}
                placeholder="Search spare code or model..."
              />
              <div className="max-h-[32vh] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-2 dark:border-white/10">
                {filteredSpares.map((spare) => (
                  <button
                    key={spare.key}
                    type="button"
                    onClick={() => addSpareOption(spare.key)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{spare.spare_code}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{spare.model_code}</p>
                      </div>
                      <Badge variant="outline">Add</Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Available quantity: {spare.available_quantity}</p>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Price: Rs{spare.unit_price.toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quotations Workspace
            </CardTitle>
            <CardDescription>Generate a quotation plus performer invoice without saving any customer, company, or document data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-slate-800/30">
              <p className="font-semibold text-slate-900 dark:text-white">{totalItems} line item(s) prepared</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Target: {targetType} / {targetCode}</p>
            </div>

            <div className="space-y-3">
              {vehicleDetails.map((item) => (
                <div key={item.model_code} className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.model_name}</p>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{item.model_code}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        Colors: {item.colors.length ? item.colors.join(", ") : "None currently available"}
                      </p>
                    </div>
                    <Button type="button" size="icon" variant="outline" onClick={() => setVehicleLines((current) => current.filter((line) => line.model_code !== item.model_code))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" min={1} value={String(item.quantity)} onChange={(event) => updateVehicleQuantity(item.model_code, event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit price</Label>
                      <Input readOnly value={formatMoneyForInput(String(item.unit_price))} />
                    </div>
                  </div>
                </div>
              ))}

              {spareDetails.map((item) => (
                <div key={item.key} className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.spare_code}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.model_code}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        Available quantity now: {item.available_quantity}
                      </p>
                    </div>
                    <Button type="button" size="icon" variant="outline" onClick={() => setSpareLines((current) => current.filter((line) => line.key !== item.key))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" min={1} value={String(item.quantity)} onChange={(event) => updateSpareQuantity(item.key, event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit price</Label>
                      <Input readOnly value={formatMoneyForInput(String(item.unit_price))} />
                    </div>
                  </div>
                </div>
              ))}

              {totalItems === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                  Add at least one vehicle model or spare item to begin.
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-200 pt-4 dark:border-white/10">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Base price</Label>
                  <Input readOnly value={formatMoneyForInput(String(basePrice))} />
                </div>
                <div className="space-y-2">
                  <Label>Registration fee</Label>
                  <Input value={registrationFee} onChange={(event) => setRegistrationFee(sanitizeMoneyInput(event.target.value))} onBlur={() => setRegistrationFee(formatMoneyForInput(registrationFee))} />
                </div>
                <div className="space-y-2">
                  <Label>Advance payment</Label>
                  <Input value={advancePayment} onChange={(event) => setAdvancePayment(sanitizeMoneyInput(event.target.value))} onBlur={() => setAdvancePayment(formatMoneyForInput(advancePayment))} />
                </div>
                <div className="space-y-2">
                  <Label>Discount</Label>
                  <Input value={discount} onChange={(event) => setDiscount(sanitizeMoneyInput(event.target.value))} onBlur={() => setDiscount(formatMoneyForInput(discount))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Payment method</Label>
                  <Input value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} />
                </div>
              </div>
            </div>

            <Button disabled={submitting || totalItems === 0} onClick={handleGenerate} className="w-full">
              {submitting ? "Generating documents..." : "Generate Quotation + Performer Invoice"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
