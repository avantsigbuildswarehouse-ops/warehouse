"use client";

import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bike, Boxes, CircleDollarSign, Plus, RefreshCw } from "lucide-react";

import {
  vehicleInventorySchema,
  type VehicleInventoryFormValues,
} from "@/lib/validations/vehicle-inventory.schema";
import ModelDialog from "@/components/model-dialog";
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

type InventoryItem = {
  model_code: string;
  model_name: string;
  model_quantity: number;
  engine_number: string;
  chassis_number: string;
  color: string;
  yom: string;
  version: string;
  price: number;
};

type InventoryResponse = {
  summary: {
    totalUnits: number;
    totalModels: number;
    totalValue: number;
  };
  items: InventoryItem[];
};

type StatusState =
  | {
      tone: "success" | "error";
      message: string;
    }
  | null;

const blankBike = {
  engineNumber: "",
  chassisNumber: "",
  color: "",
  yom: "",
  version: "",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export default function VehicleInventoryForm() {
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [inventory, setInventory] = useState<InventoryResponse>({
    summary: { totalUnits: 0, totalModels: 0, totalValue: 0 },
    items: [],
  });
  const [open, setOpen] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
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
  } = useForm<VehicleInventoryFormValues>({
    resolver: zodResolver(vehicleInventorySchema),
    defaultValues: {
      modelCode: "",
      bikes: [blankBike],
    },
  });

  const selectedModel = watch("modelCode");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "bikes",
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
      const res = await fetch("/api/warehouse/inventory");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load inventory");
      }

      setInventory(
        data ?? {
          summary: { totalUnits: 0, totalModels: 0, totalValue: 0 },
          items: [],
        }
      );
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Failed to load inventory",
      });
    } finally {
      setLoadingInventory(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadModels(), loadInventory()]);
  }, []);

  async function onSubmit(data: VehicleInventoryFormValues) {
    setSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch("/api/warehouse/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to save inventory");
      }

      setStatus({
        tone: "success",
        message: `${data.bikes.length} bike${
          data.bikes.length > 1 ? "s were" : " was"
        } added to inventory.`,
      });
      reset({
        modelCode: data.modelCode,
        bikes: [blankBike],
      });
      await Promise.all([loadModels(), loadInventory()]);
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Failed to save inventory",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const selectedModelData = useMemo(
    () => models.find((model) => model.model_code === selectedModel),
    [models, selectedModel]
  );

  const visibleInventory = useMemo(() => {
    if (!selectedModel) return inventory.items;
    return inventory.items.filter((item) => item.model_code === selectedModel);
  }, [inventory.items, selectedModel]);

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#f7f9fc_0%,#eef3f8_100%)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <Badge variant="outline" className="w-fit border-slate-300">
            Admin inventory control
          </Badge>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Vehicle inventory
              </h1>
              <p className="max-w-3xl text-sm text-slate-600">
                Add incoming bikes, review the full stock list, and keep model
                quantities in sync from one place.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => void Promise.all([loadModels(), loadInventory()])}
              disabled={loadingModels || loadingInventory}
            >
              <RefreshCw className="size-4" />
              Refresh data
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardDescription>Total bikes in stock</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <Bike className="size-5 text-slate-500" />
                {formatNumber(inventory.summary.totalUnits)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardDescription>Active bike models</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <Boxes className="size-5 text-slate-500" />
                {formatNumber(inventory.summary.totalModels)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardDescription>Listed inventory value</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <CircleDollarSign className="size-5 text-slate-500" />
                {formatNumber(inventory.summary.totalValue)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <Card className="border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Add bikes to inventory</CardTitle>
              <CardDescription>
                Choose a model, enter each unit&apos;s unique details, then save
                them in a single batch.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="modelCode">Vehicle model</Label>
                  <div className="flex flex-col gap-3 md:flex-row">
                    <select
                      id="modelCode"
                      className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none ring-0 transition focus:border-slate-400"
                      value={selectedModel}
                      disabled={loadingModels}
                      onChange={(event) =>
                        setValue("modelCode", event.target.value, {
                          shouldValidate: true,
                        })
                      }
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

                    <Button type="button" onClick={() => setOpen(true)}>
                      <Plus className="size-4" />
                      Add model
                    </Button>
                  </div>

                  {errors.modelCode ? (
                    <p className="text-sm text-red-600">
                      {errors.modelCode.message}
                    </p>
                  ) : null}
                </div>

                {selectedModelData ? (
                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Model code
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedModelData.model_code}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Unit price
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatNumber(Number(selectedModelData.price ?? 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Current stock
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatNumber(Number(selectedModelData.quantity ?? 0))}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Bike #{index + 1}
                          </p>
                          <p className="text-xs text-slate-500">
                            Engine, chassis, appearance, and version details.
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

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`engine-${index}`}>Engine number</Label>
                          <Input
                            id={`engine-${index}`}
                            {...register(`bikes.${index}.engineNumber`)}
                            placeholder="Engine number"
                          />
                          {errors.bikes?.[index]?.engineNumber ? (
                            <p className="text-sm text-red-600">
                              {errors.bikes[index]?.engineNumber?.message}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`chassis-${index}`}>Chassis number</Label>
                          <Input
                            id={`chassis-${index}`}
                            {...register(`bikes.${index}.chassisNumber`)}
                            placeholder="Chassis number"
                          />
                          {errors.bikes?.[index]?.chassisNumber ? (
                            <p className="text-sm text-red-600">
                              {errors.bikes[index]?.chassisNumber?.message}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`color-${index}`}>Color</Label>
                          <Input
                            id={`color-${index}`}
                            {...register(`bikes.${index}.color`)}
                            placeholder="Color"
                          />
                          {errors.bikes?.[index]?.color ? (
                            <p className="text-sm text-red-600">
                              {errors.bikes[index]?.color?.message}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`yom-${index}`}>Year of manufacture</Label>
                          <Input
                            id={`yom-${index}`}
                            {...register(`bikes.${index}.yom`)}
                            placeholder="2026"
                          />
                          {errors.bikes?.[index]?.yom ? (
                            <p className="text-sm text-red-600">
                              {errors.bikes[index]?.yom?.message}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`version-${index}`}>Version</Label>
                          <Input
                            id={`version-${index}`}
                            {...register(`bikes.${index}.version`)}
                            placeholder="ABS / Deluxe / Standard"
                          />
                          {errors.bikes?.[index]?.version ? (
                            <p className="text-sm text-red-600">
                              {errors.bikes[index]?.version?.message}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append(blankBike)}
                  >
                    <Plus className="size-4" />
                    Add another bike
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

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="min-w-40"
                  >
                    {submitting ? "Saving..." : "Save inventory"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Available models</CardTitle>
              <CardDescription>
                Stock-ready vehicle models visible to admin users.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {models.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  No models available yet.
                </div>
              ) : (
                models.map((model) => (
                  <div
                    key={model.model_code}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {model.model_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {model.model_code}
                        </p>
                      </div>

                      <Badge variant="outline">
                        {formatNumber(Number(model.quantity ?? 0))} in stock
                      </Badge>
                    </div>

                    <p className="mt-3 text-sm text-slate-600">
                      Listed price: {formatNumber(Number(model.price ?? 0))}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200/80 bg-white/90 shadow-sm">
          <CardHeader>
            <CardTitle>Bike details in stock</CardTitle>
            <CardDescription>
              {selectedModelData
                ? `Showing bikes for ${selectedModelData.model_name}.`
                : "Showing all bikes currently stored in inventory."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loadingInventory ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                Loading inventory...
              </div>
            ) : visibleInventory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                No bikes found for the current selection.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-2 font-medium">Model</th>
                      <th className="px-3 py-2 font-medium">Engine</th>
                      <th className="px-3 py-2 font-medium">Chassis</th>
                      <th className="px-3 py-2 font-medium">Color</th>
                      <th className="px-3 py-2 font-medium">YOM</th>
                      <th className="px-3 py-2 font-medium">Version</th>
                      <th className="px-3 py-2 font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleInventory.map((item) => (
                      <tr
                        key={`${item.engine_number}-${item.chassis_number}`}
                        className="rounded-2xl bg-slate-50 text-slate-700"
                      >
                        <td className="rounded-l-2xl px-3 py-3 align-top">
                          <p className="font-semibold text-slate-900">
                            {item.model_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.model_code}
                          </p>
                        </td>
                        <td className="px-3 py-3">{item.engine_number}</td>
                        <td className="px-3 py-3">{item.chassis_number}</td>
                        <td className="px-3 py-3">{item.color}</td>
                        <td className="px-3 py-3">{item.yom}</td>
                        <td className="px-3 py-3">{item.version}</td>
                        <td className="rounded-r-2xl px-3 py-3 font-medium text-slate-900">
                          {formatNumber(item.price)}
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

      <ModelDialog
        open={open}
        setOpen={setOpen}
        onCreated={(newModel) => {
          setModels((prev) =>
            [...prev, newModel].sort((a, b) =>
              a.model_name.localeCompare(b.model_name)
            )
          );
          setValue("modelCode", newModel.model_code, { shouldValidate: true });
          setStatus({
            tone: "success",
            message: `${newModel.model_name} is now available to receive stock.`,
          });
        }}
      />
    </div>
  );
}
