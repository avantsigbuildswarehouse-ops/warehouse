"use client";

import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleDollarSign, PackagePlus, RefreshCw, Upload, Wrench } from "lucide-react";

import {
  vehicleSpareSchema,
  type VehicleSpareFormValues,
} from "@/lib/validations/warehouse/vehicle-spare.schema";
import SpareDialog from "@/components/spare-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PackageOpen } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VehicleModel = {
  model_code: string;
  model_name: string;
  price: number | string | null;
  warehouse_quantity: number | null;
  arrived_quantity: number | null;
};

type SpareCode = {
  model_code: string;
  spare_code: string;
  spare_name: string;
  price: number | string | null;
  arrived_quantity: number | null;
  warehouse_quantity: number | null;
};

type StatusState =
  | {
      tone: "success" | "error";
      message: string;
    }
  | null;

const blankSpareSerial = { serialNumber: "" };

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SparesInventory() {
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [spares, setSpares] = useState<SpareCode[]>([]);
  const [allSpares, setAllSpares] = useState<SpareCode[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingSpares, setLoadingSpares] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [status, setStatus] = useState<StatusState>(null);
  const [autoCreateSpares, setAutoCreateSpares] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<VehicleSpareFormValues>({
    resolver: zodResolver(vehicleSpareSchema),
    defaultValues: {
      modelCode: "",
      spareCode: "",
      spares: [blankSpareSerial],
    },
  });

  const modelCode = watch("modelCode");
  const spareCode = watch("spareCode");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "spares",
  });

  async function loadModels() {
    setLoadingModels(true);

    try {
      const res = await fetch("/api/warehouse/models");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load models");
      }

      setModels(Array.isArray(data) ? data : []);
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Failed to load models",
      });
    } finally {
      setLoadingModels(false);
    }
  }

  async function loadAllSpares() {
    try {
      const res = await fetch("/api/warehouse/spares");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load all spares");
      }

      setAllSpares(Array.isArray(data) ? data : []);
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Failed to load all spares",
      });
    }
  }

  async function loadSpares(code: string) {
    if (!code) {
      setSpares([]);
      return;
    }

    setLoadingSpares(true);

    try {
      const res = await fetch(`/api/warehouse/spares?model=${code}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load spares");
      }

      setSpares(Array.isArray(data) ? data : []);
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Failed to load spares",
      });
    } finally {
      setLoadingSpares(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadModels(), loadAllSpares()]);
  }, []);

  useEffect(() => {
    void loadSpares(modelCode);
  }, [modelCode]);

  async function onSubmit(data: VehicleSpareFormValues) {
    setSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch("/api/warehouse/spare-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to save spare inventory");
      }

      setStatus({
        tone: "success",
        message: `${data.spares.length} spare serial${
          data.spares.length > 1 ? "s were" : " was"
        } added successfully.`,
      });
      reset({
        modelCode: data.modelCode,
        spareCode: data.spareCode,
        spares: [blankSpareSerial],
      });
      await Promise.all([loadSpares(data.modelCode), loadAllSpares()]);
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to save spare inventory",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function importSpares() {
    if (!modelCode || !importFile) {
      setStatus({ tone: "error", message: "Select model and upload file first." });
      return;
    }

    if (!spareCode && !autoCreateSpares) {
      setStatus({ tone: "error", message: "Either select a spare code or enable 'Auto-create spares' option." });
      return;
    }

    setImporting(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append("modelCode", modelCode);
      if (spareCode) formData.append("spareCode", spareCode);
      formData.append("autoCreateSpares", String(autoCreateSpares));
      formData.append("file", importFile);

      const res = await fetch("/api/warehouse/spare-inventory/import", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Failed to import spare stock");

      setStatus({
        tone: "success",
        message: `Imported ${result.added} spare serial(s)${result.createdSpares ? ` (${result.createdSpares} new spare type${result.createdSpares > 1 ? 's' : ''})` : ''}. Skipped ${result.skipped || 0} unmatched/invalid row(s).`,
      });
      setImportFile(null);
      await Promise.all([loadSpares(modelCode), loadAllSpares()]);
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to import spare stock",
      });
    } finally {
      setImporting(false);
    }
  }

  const selectedModel = useMemo(
    () => models.find((model) => model.model_code === modelCode),
    [modelCode, models]
  );

  const selectedSpare = useMemo(
    () => spares.find((spare) => spare.spare_code === spareCode),
    [spareCode, spares]
  );

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalArrived = allSpares.reduce((sum, s) => sum + (Number(s.arrived_quantity) || 0), 0);
    const totalWarehouse = allSpares.reduce((sum, s) => sum + (Number(s.warehouse_quantity) || 0), 0);
    const totalValue = allSpares.reduce((sum, s) => sum + (Number(s.price) || 0) * (Number(s.warehouse_quantity) || 0), 0);
    
    return {
      totalArrived,
      totalWarehouse,
      totalSpareTypes: allSpares.length,
      totalValue,
    };
  }, [allSpares]);

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900/60">
          <Badge variant="outline" className="w-fit border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 text-slate-700 bg-slate-50">
            Admin spare control
          </Badge>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Spare inventory
              </h1>
              <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-400">
                Add spare stock to inventory. View all spare inventory data in the Inventory Data page.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void Promise.all([
                  loadModels(),
                  modelCode ? loadSpares(modelCode) : Promise.resolve(),
                  loadAllSpares(),
                ])
              }
              disabled={loadingModels || loadingSpares}
            >
              <RefreshCw className="size-4" />
              Refresh data
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-sky-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">Spares Arrived</CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-sky-100 p-2.5 dark:bg-sky-500/20">
                  <PackagePlus className="size-6 text-sky-600 dark:text-sky-400" />
                </div>
                {formatNumber(summaryStats.totalArrived)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-green-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,250,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">Currently in Warehouse</CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-green-100 p-2.5 dark:bg-green-500/20">
                  <Wrench className="size-6 text-green-600 dark:text-green-400" />
                </div>
                {formatNumber(summaryStats.totalWarehouse)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-amber-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">Spare codes in use</CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-amber-100 p-2.5 dark:bg-amber-500/20">
                  <Wrench className="size-6 text-amber-600 dark:text-amber-400" />
                </div>
                {formatNumber(summaryStats.totalSpareTypes)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-indigo-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,242,255,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">Total spare value</CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-indigo-100 p-2.5 dark:bg-indigo-500/20">
                  <CircleDollarSign className="size-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                {formatNumber(summaryStats.totalValue)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
            <CardHeader>
              <CardTitle className="dark:text-white">Add spare stock</CardTitle>
              <CardDescription className="dark:text-slate-400">
                Pick a bike model, choose a spare code, then register each new
                serial number in one submission.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="spare-model">Vehicle model</Label>
                  <select
                    id="spare-model"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:bg-slate-900"
                    value={modelCode}
                    onChange={(event) => {
                      setValue("modelCode", event.target.value, {
                        shouldValidate: true,
                      });
                      setValue("spareCode", "", { shouldValidate: true });
                    }}
                    disabled={loadingModels}
                  >
                    <option value="">
                      {loadingModels ? "Loading models..." : "Select a model"}
                    </option>

                    {models.map((model) => (
                      <option key={model.model_code} value={model.model_code}>
                        {model.model_name} ({model.model_code})
                      </option>
                    ))}
                  </select>
                  {errors.modelCode ? (
                    <p className="text-sm text-red-600">
                      {errors.modelCode.message}
                    </p>
                  ) : null}
                </div>

                {selectedModel ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">
                      {selectedModel.model_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedModel.model_code}
                    </p>
                    <p className="mt-3 text-sm text-slate-600">
                      Vehicle stock on hand:{" "}
                      {formatNumber(Number(selectedModel.warehouse_quantity ?? 0))}
                    </p>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="spare-code">Spare code</Label>
                  <div className="flex flex-col gap-3 md:flex-row">
                    <select
                      id="spare-code"
                      className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:bg-slate-900"
                      value={spareCode}
                      onChange={(event) =>
                        setValue("spareCode", event.target.value, {
                          shouldValidate: true,
                        })
                      }
                      disabled={!modelCode || loadingSpares}
                    >
                      <option value="">
                        {!modelCode
                          ? "Select a model first"
                          : loadingSpares
                            ? "Loading spares..."
                            : "Select a spare"}
                      </option>

                      {spares.map((spare) => (
                        <option key={spare.spare_code} value={spare.spare_code}>
                          {spare.spare_name} ({spare.spare_code})
                        </option>
                      ))}
                    </select>

                    <Button
                      type="button"
                      onClick={() => setOpen(true)}
                      disabled={!modelCode}
                    >
                      Add spare
                    </Button>
                  </div>
                  {errors.spareCode ? (
                    <p className="text-sm text-red-600">
                      {errors.spareCode.message || "Select a spare code or enable auto-create spares below"}
                    </p>
                  ) : null}
                </div>

                {selectedSpare ? (
                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4 dark:border-white/10 dark:bg-slate-800/40">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Spare code
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedSpare.spare_code}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Unit price
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {formatNumber(Number(selectedSpare.price ?? 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Arrived
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {formatNumber(Number(selectedSpare.arrived_quantity ?? 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        In warehouse
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {formatNumber(Number(selectedSpare.warehouse_quantity ?? 0))}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Import spare stock from file
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Allowed: PDF, XLSX, TSV, ODS. Rows import only when Model matches the selected model. Spare is matched when present. Excel columns: Model, Spare Name, Serial Number, Price.
                    </p>
                  </div>
                  
                  <div className="mb-3 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCreateSpares}
                        onChange={(e) => setAutoCreateSpares(e.target.checked)}
                        disabled={importing}
                        className="cursor-pointer"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        Auto-create spare types from file (if not already exists)
                      </span>
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 ml-6">
                      {autoCreateSpares 
                        ? "Spare codes will be auto-generated based on spare names. You can still select a specific spare to import into."
                        : "Select a specific spare code below. Enable auto-create to import multiple spare types at once."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <Input
                      type="file"
                      accept=".pdf,.xlsx,.tsv,.ods"
                      onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                      disabled={!modelCode || importing}
                    />
                    <Button
                      type="button"
                      onClick={() => void importSpares()}
                      disabled={!modelCode || !importFile || importing || (!spareCode && !autoCreateSpares)}
                    >
                      <Upload className="size-4" />
                      {importing ? "Importing..." : "Upload & Import"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-800/20"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            Serial #{index + 1}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Track each individual spare item by serial number.
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          Remove
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`serial-${index}`} className="dark:text-slate-300">Serial number</Label>
                        <Input
                          id={`serial-${index}`}
                          {...register(`spares.${index}.serialNumber`)}
                          placeholder="Serial number"
                          className="dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                        />
                        {errors.spares?.[index]?.serialNumber ? (
                          <p className="text-sm text-red-600">
                            {errors.spares[index]?.serialNumber?.message}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append(blankSpareSerial)}
                  >
                    Add another serial
                  </Button>
                </div>

                {status ? (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      status.tone === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {status.message}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="min-w-40"
                  >
                    {submitting ? "Saving..." : "Save spare stock"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
            <CardHeader>
              <CardTitle className="dark:text-white">Spare catalog</CardTitle>
              <CardDescription className="dark:text-slate-400">
                {modelCode
                  ? "Catalog entries for the selected model."
                  : "Select a model to inspect the spare catalog."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {!modelCode ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Choose a model to load available spare codes.
                </div>
              ) : spares.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No spare codes found for this model yet.
                </div>
              ) : (
                spares.map((spare) => (
                  <div
                    key={spare.spare_code}
                    className="rounded-2xl border border-slate-200 p-4 dark:border-white/10 dark:bg-slate-800/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950 dark:text-white">
                          {spare.spare_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {spare.spare_code}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2 flex-wrap">
                      <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                        Arrived: {formatNumber(Number(spare.arrived_quantity ?? 0))}
                      </Badge>
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">
                        Warehouse: {formatNumber(Number(spare.warehouse_quantity ?? 0))}
                      </Badge>
                    </div>

                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                      Listed price: {formatNumber(Number(spare.price ?? 0))}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <SpareDialog
        open={open}
        setOpen={setOpen}
        modelCode={modelCode}
        onCreated={(newSpare) => {
          const spareWithQuantities = {
            ...newSpare,
            arrived_quantity: 0,
            warehouse_quantity: 0,
          };
          setSpares((prev) =>
            [...prev, spareWithQuantities].sort((a, b) =>
              a.spare_name.localeCompare(b.spare_name)
            )
          );
          setValue("spareCode", newSpare.spare_code, { shouldValidate: true });
          setStatus({
            tone: "success",
            message: `${newSpare.spare_name} is ready to receive serial-tracked stock.`,
          });
        }}
      />
    </div>
  );
}