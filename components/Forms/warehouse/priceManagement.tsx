"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Save, Trash2 } from "lucide-react";

import { AdminCredentialsModal } from "@/components/admin/admin-credentials-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VehicleModel = {
  model_code: string;
  model_name: string;
  price: number | string | null;
  arrived_quantity: number | null;
  warehouse_quantity: number | null;
};

type SpareCode = {
  model_code: string;
  spare_code: string;
  spare_name: string;
  price: number | string | null;
  arrived_quantity: number | null;
  warehouse_quantity: number | null;
};

type DeleteTarget =
  | { kind: "vehicle"; modelCode: string; label: string }
  | { kind: "spare"; modelCode: string; spareCode: string; label: string };

function toPriceInput(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "0";
  return String(value);
}

async function readError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  return data.error || fallback;
}

export default function PriceManagement() {
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [spares, setSpares] = useState<SpareCode[]>([]);
  const [vehiclePrices, setVehiclePrices] = useState<Record<string, string>>({});
  const [sparePrices, setSparePrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const [modelsResponse, sparesResponse] = await Promise.all([
        fetch("/api/warehouse/models"),
        fetch("/api/warehouse/spares"),
      ]);

      if (!modelsResponse.ok) {
        throw new Error(await readError(modelsResponse, "Failed to load vehicle models"));
      }

      if (!sparesResponse.ok) {
        throw new Error(await readError(sparesResponse, "Failed to load spare codes"));
      }

      const modelsData = (await modelsResponse.json()) as VehicleModel[];
      const sparesData = (await sparesResponse.json()) as SpareCode[];

      setModels(modelsData);
      setSpares(sparesData);
      setVehiclePrices(
        Object.fromEntries(modelsData.map((model) => [model.model_code, toPriceInput(model.price)]))
      );
      setSparePrices(
        Object.fromEntries(
          sparesData.map((spare) => [`${spare.model_code}:${spare.spare_code}`, toPriceInput(spare.price)])
        )
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load price data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totalVehicleValue = useMemo(
    () =>
      models.reduce(
        (sum, model) => sum + Number(model.price ?? 0) * Number(model.warehouse_quantity ?? 0),
        0
      ),
    [models]
  );

  const totalSpareValue = useMemo(
    () =>
      spares.reduce(
        (sum, spare) => sum + Number(spare.price ?? 0) * Number(spare.warehouse_quantity ?? 0),
        0
      ),
    [spares]
  );

  const updateVehiclePrice = async (model: VehicleModel) => {
    const price = Number(vehiclePrices[model.model_code]);
    if (!Number.isFinite(price) || price < 0) {
      setMessage("Enter a valid vehicle price.");
      return;
    }

    setSavingKey(`vehicle:${model.model_code}`);
    setMessage(null);

    try {
      const response = await fetch("/api/warehouse/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_code: model.model_code, price }),
      });

      if (!response.ok) throw new Error(await readError(response, "Failed to update vehicle price"));

      setMessage(`Updated ${model.model_code} price.`);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update vehicle price");
    } finally {
      setSavingKey(null);
    }
  };

  const updateSparePrice = async (spare: SpareCode) => {
    const key = `${spare.model_code}:${spare.spare_code}`;
    const price = Number(sparePrices[key]);
    if (!Number.isFinite(price) || price < 0) {
      setMessage("Enter a valid spare price.");
      return;
    }

    setSavingKey(`spare:${key}`);
    setMessage(null);

    try {
      const response = await fetch("/api/warehouse/spares", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_code: spare.model_code,
          spare_code: spare.spare_code,
          price,
        }),
      });

      if (!response.ok) throw new Error(await readError(response, "Failed to update spare price"));

      setMessage(`Updated ${spare.spare_code} price.`);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update spare price");
    } finally {
      setSavingKey(null);
    }
  };

  const openDeleteModal = (target: DeleteTarget) => {
    setDeleteTarget(target);
    setDeleteError(null);
    setAdminPassword("");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const endpoint =
        deleteTarget.kind === "vehicle" ? "/api/warehouse/models" : "/api/warehouse/spares";
      const body =
        deleteTarget.kind === "vehicle"
          ? {
              model_code: deleteTarget.modelCode,
              adminEmail,
              adminPassword,
            }
          : {
              model_code: deleteTarget.modelCode,
              spare_code: deleteTarget.spareCode,
              adminEmail,
              adminPassword,
            };

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(await readError(response, "Delete failed"));

      setMessage(`Deleted ${deleteTarget.label}.`);
      setDeleteTarget(null);
      setAdminPassword("");
      await loadData();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <Badge variant="outline" className="mb-3 w-fit border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Admin only
          </Badge>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Prices & Model Codes
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Edit active vehicle and spare prices, or remove unused model/code records with admin credential confirmation.
              </p>
            </div>
            <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {message && (
          <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <CardContent className="pt-6 text-sm text-slate-700 dark:text-slate-300">{message}</CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <CardHeader>
              <CardTitle>Vehicle Model Codes</CardTitle>
              <CardDescription>
                {models.length} model(s), warehouse value Rs {totalVehicleValue.toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading vehicle models...</p>
              ) : models.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No vehicle models found.</p>
              ) : (
                models.map((model) => {
                  const saving = savingKey === `vehicle:${model.model_code}`;
                  return (
                    <div key={model.model_code} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                      <div className="mb-3 flex flex-col gap-1">
                        <span className="font-semibold text-slate-900 dark:text-white">{model.model_name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {model.model_code} - Warehouse Qty: {model.warehouse_quantity ?? 0}
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                        <div className="space-y-1.5">
                          <Label>Price</Label>
                          <Input
                            type="number"
                            min="0"
                            value={vehiclePrices[model.model_code] ?? "0"}
                            onChange={(event) =>
                              setVehiclePrices((current) => ({
                                ...current,
                                [model.model_code]: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <Button onClick={() => void updateVehiclePrice(model)} disabled={saving}>
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Save
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() =>
                            openDeleteModal({
                              kind: "vehicle",
                              modelCode: model.model_code,
                              label: `${model.model_name} (${model.model_code})`,
                            })
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <CardHeader>
              <CardTitle>Spare Codes</CardTitle>
              <CardDescription>
                {spares.length} spare code(s), warehouse value Rs {totalSpareValue.toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading spare codes...</p>
              ) : spares.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No spare codes found.</p>
              ) : (
                spares.map((spare) => {
                  const key = `${spare.model_code}:${spare.spare_code}`;
                  const saving = savingKey === `spare:${key}`;
                  return (
                    <div key={key} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                      <div className="mb-3 flex flex-col gap-1">
                        <span className="font-semibold text-slate-900 dark:text-white">{spare.spare_name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {spare.spare_code} - Model: {spare.model_code} - Warehouse Qty: {spare.warehouse_quantity ?? 0}
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                        <div className="space-y-1.5">
                          <Label>Price</Label>
                          <Input
                            type="number"
                            min="0"
                            value={sparePrices[key] ?? "0"}
                            onChange={(event) =>
                              setSparePrices((current) => ({
                                ...current,
                                [key]: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <Button onClick={() => void updateSparePrice(spare)} disabled={saving}>
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Save
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() =>
                            openDeleteModal({
                              kind: "spare",
                              modelCode: spare.model_code,
                              spareCode: spare.spare_code,
                              label: `${spare.spare_name} (${spare.spare_code})`,
                            })
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {deleteTarget && (
        <AdminCredentialsModal
          title="Confirm code deletion"
          description={`Enter admin credentials to delete ${deleteTarget.label}.`}
          confirmLabel="Delete"
          adminEmail={adminEmail}
          adminPassword={adminPassword}
          error={deleteError}
          loading={deleting}
          onEmailChange={setAdminEmail}
          onPasswordChange={setAdminPassword}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}
