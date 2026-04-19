"use client";

import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleDollarSign, PackagePlus, RefreshCw, Wrench } from "lucide-react";

import {
  vehicleSpareSchema,
  type VehicleSpareFormValues,
} from "@/lib/validations/warehouse/vehicle-spare.schema";
import SpareDialog from "@/components/spare-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  quantity: number | null;
};

type SpareCode = {
  model_code: string;
  spare_code: string;
  spare_name: string;
  price: number | string | null;
  quantity: number | null;
};

type SpareInventoryItem = {
  model_code: string;
  model_name: string;
  spare_code: string;
  spare_name: string;
  serial_number: string;
  status: string;
  price: number;
  stock_quantity: number;
};

type SpareInventoryResponse = {
  summary: {
    totalUnits: number;
    totalSpareTypes: number;
    totalValue: number;
  };
  items: SpareInventoryItem[];
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
  const [inventory, setInventory] = useState<SpareInventoryResponse>({
    summary: { totalUnits: 0, totalSpareTypes: 0, totalValue: 0 },
    items: [],
  });
  const [open, setOpen] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingSpares, setLoadingSpares] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);

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

  async function loadInventory() {
    setLoadingInventory(true);

    try {
      const res = await fetch("/api/warehouse/spare-inventory");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load spare inventory");
      }

      setInventory(
        data && Array.isArray(data.items)
          ? data
          : { summary: { totalUnits: 0, totalSpareTypes: 0, totalValue: 0 }, items: [] }
      );
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load spare inventory",
      });
    } finally {
      setLoadingInventory(false);
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
    void Promise.all([loadModels(), loadInventory()]);
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
      await Promise.all([loadSpares(data.modelCode), loadInventory()]);
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

  const selectedModel = useMemo(
    () => models.find((model) => model.model_code === modelCode),
    [modelCode, models]
  );

  const selectedSpare = useMemo(
    () => spares.find((spare) => spare.spare_code === spareCode),
    [spareCode, spares]
  );

  const visibleInventory = useMemo(() => {
    return inventory.items.filter((item) => {
      const matchesModel = modelCode ? item.model_code === modelCode : true;
      const matchesSpare = spareCode ? item.spare_code === spareCode : true;
      return matchesModel && matchesSpare;
    });
  }, [inventory.items, modelCode, spareCode]);

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
                Keep the spare catalog organized by model, add serial-tracked
                stock, and review every available unit from the admin workspace.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void Promise.all([
                  loadModels(),
                  modelCode ? loadSpares(modelCode) : Promise.resolve(),
                  loadInventory(),
                ])
              }
              disabled={loadingModels || loadingSpares || loadingInventory}
            >
              <RefreshCw className="size-4" />
              Refresh data
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
            <CardHeader>
              <CardDescription className="dark:text-slate-400">Serial-tracked spare units</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl dark:text-white">
                <PackagePlus className="size-5 text-slate-500" />
                {formatNumber(inventory.summary.totalUnits)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
            <CardHeader>
              <CardDescription className="dark:text-slate-400">Spare codes in use</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl dark:text-white">
                <Wrench className="size-5 text-slate-500" />
                {formatNumber(inventory.summary.totalSpareTypes)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
            <CardHeader>
              <CardDescription className="dark:text-slate-400">Listed spare value</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl dark:text-white">
                <CircleDollarSign className="size-5 text-slate-500" />
                {formatNumber(inventory.summary.totalValue)}
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
                      {formatNumber(Number(selectedModel.quantity ?? 0))}
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
                      {errors.spareCode.message}
                    </p>
                  ) : null}
                </div>

                {selectedSpare ? (
                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3 dark:border-white/10 dark:bg-slate-800/40">
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
                        Current stock
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {formatNumber(Number(selectedSpare.quantity ?? 0))}
                      </p>
                    </div>
                  </div>
                ) : null}

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

                      <Badge variant="outline" className="dark:border-white/10 dark:bg-slate-900">
                        {formatNumber(Number(spare.quantity ?? 0))} in stock
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

        <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="dark:text-white">Spare unit details</CardTitle>
            <CardDescription className="dark:text-slate-400">
              {selectedSpare
                ? `Showing serials for ${selectedSpare.spare_name}.`
                : modelCode
                  ? "Showing all spare serials for the selected model."
                  : "Showing every spare serial currently in stock."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loadingInventory ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Loading spare inventory...
              </div>
            ) : visibleInventory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No spare inventory found for the current selection.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="px-3 py-2 font-medium">Model</th>
                      <th className="px-3 py-2 font-medium">Spare</th>
                      <th className="px-3 py-2 font-medium">Serial</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Price</th>
                      <th className="px-3 py-2 font-medium">Stock count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleInventory.map((item) => (
                      <tr
                        key={`${item.model_code}-${item.spare_code}-${item.serial_number}`}
                        className="bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800/70"
                      >
                        <td className="rounded-l-2xl px-3 py-3 align-top">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {item.model_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.model_code}
                          </p>
                        </td>

                        <td className="px-3 py-3 align-top">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {item.spare_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.spare_code}
                          </p>
                        </td>

                        <td className="px-3 py-3">
                          {item.serial_number}
                        </td>

                        <td className="px-3 py-3">
                          {item.status}
                        </td>

                        <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">
                          {formatNumber(item.price)}
                        </td>

                        <td className="rounded-r-2xl px-3 py-3">
                          {formatNumber(item.stock_quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SpareDialog
        open={open}
        setOpen={setOpen}
        modelCode={modelCode}
        onCreated={(newSpare) => {
          setSpares((prev) =>
            [...prev, newSpare].sort((a, b) =>
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
