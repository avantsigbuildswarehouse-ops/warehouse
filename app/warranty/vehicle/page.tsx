"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import AppLoading from "@/components/feedback/app-loading";
import { parseVehicleQrContent } from "@/lib/utils/sales/vehicle-qr";

type WarrantyResponse =
  | {
      valid: true;
      vehicle: {
        source: "dealer" | "showroom";
        model_code: string | null;
        engine_number: string | null;
        chassis_number: string | null;
        color: string | null;
        sold_at: string | null;
      };
    }
  | { valid: false; message: string }
  | { error: string };

async function verifyVehicle(engine: string, chassis: string, soldAt: string) {
  const qp = new URLSearchParams({ engine, chassis, soldAt });
  const res = await fetch(`/api/warranty/vehicle?${qp.toString()}`);
  return (await res.json()) as WarrantyResponse;
}

export default function VehicleWarrantyPage() {
  const params = useSearchParams();
  const rawPayload = params.get("payload") || "";
  const engine = params.get("engine") || "";
  const chassis = params.get("chassis") || "";
  const soldAt = params.get("soldAt") || "";

  const multiPayload = useMemo(() => {
    if (rawPayload) return parseVehicleQrContent(rawPayload);
    return null;
  }, [rawPayload]);

  const hasSingleParams = Boolean(engine && chassis && soldAt);
  const hasMulti = Boolean(multiPayload?.vehicles?.length);

  const [loading, setLoading] = useState(hasSingleParams || hasMulti);
  const [singleResult, setSingleResult] = useState<WarrantyResponse | null>(null);
  const [multiResults, setMultiResults] = useState<
    Array<{ label: string; result: WarrantyResponse }>
  >([]);

  useEffect(() => {
    if (hasMulti && multiPayload) {
      const loadAll = async () => {
        setLoading(true);
        const results = await Promise.all(
          multiPayload.vehicles.map(async (vehicle) => ({
            label: vehicle.label,
            result: await verifyVehicle(vehicle.engine, vehicle.chassis, vehicle.soldAt),
          }))
        );
        setMultiResults(results);
        setLoading(false);
      };
      void loadAll();
      return;
    }

    if (!hasSingleParams) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setSingleResult(await verifyVehicle(engine, chassis, soldAt));
      setLoading(false);
    };
    void load();
  }, [hasMulti, hasSingleParams, multiPayload, engine, chassis, soldAt]);

  if (loading) {
    return <AppLoading />;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-[#080B14]">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Vehicle warranty check</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Verify engine, chassis and sold date from QR data.
        </p>

        {hasMulti ? (
          <div className="mt-6 space-y-4">
            {multiResults.map((entry) => (
              <div
                key={entry.label}
                className="rounded-xl border border-slate-200 p-4 dark:border-white/10"
              >
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{entry.label}</p>
                {entry.result && "valid" in entry.result && entry.result.valid ? (
                  <div className="space-y-1 text-sm text-emerald-800 dark:text-emerald-300">
                    <p className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4" /> Verified
                    </p>
                    <p>Model: {entry.result.vehicle.model_code || "-"}</p>
                    <p>Engine: {entry.result.vehicle.engine_number || "-"}</p>
                    <p>Chassis: {entry.result.vehicle.chassis_number || "-"}</p>
                  </div>
                ) : (
                  <p className="text-sm text-rose-700 dark:text-rose-300">
                    {"message" in entry.result
                      ? entry.result.message
                      : (entry.result as { error?: string })?.error || "Check failed"}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : !hasSingleParams ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
            Missing QR values. Scan a valid vehicle warranty QR.
          </div>
        ) : singleResult && "valid" in singleResult && singleResult.valid ? (
          <div className="mt-6 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
            <p className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" /> Warranty record verified
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              Model: {singleResult.vehicle.model_code || "-"}
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              Color: {singleResult.vehicle.color || "-"}
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              Engine: {singleResult.vehicle.engine_number || "-"}
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              Chassis: {singleResult.vehicle.chassis_number || "-"}
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              Sold at:{" "}
              {singleResult.vehicle.sold_at
                ? new Date(singleResult.vehicle.sold_at).toLocaleString()
                : "-"}
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-5 w-5" />
              {"message" in (singleResult || {})
                ? (singleResult as { message: string }).message
                : (singleResult as { error: string } | null)?.error || "Warranty check failed"}
            </p>
          </div>
        )}

        <Link href="/" className="mt-6 inline-block text-sm text-sky-600 hover:underline dark:text-sky-400">
          Back to home
        </Link>
      </div>
    </div>
  );
}
