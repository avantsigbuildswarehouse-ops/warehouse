"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

type WarrantyResponse =
  | { valid: true; vehicle: { source: "dealer" | "showroom"; model_code: string | null; engine_number: string | null; chassis_number: string | null; color: string | null; sold_at: string | null } }
  | { valid: false; message: string }
  | { error: string };

export default function VehicleWarrantyPage() {
  const params = useSearchParams();
  const engine = params.get("engine") || "";
  const chassis = params.get("chassis") || "";
  const soldAt = params.get("soldAt") || "";

  const hasRequiredParams = Boolean(engine && chassis && soldAt);
  const [loading, setLoading] = useState(hasRequiredParams);
  const [data, setData] = useState<WarrantyResponse | null>(null);

  const queryString = useMemo(() => {
    const qp = new URLSearchParams({ engine, chassis, soldAt });
    return qp.toString();
  }, [engine, chassis, soldAt]);

  useEffect(() => {
    if (!hasRequiredParams) return;
    const load = async () => {
      setLoading(true);
      const res = await fetch(`/api/warranty/vehicle?${queryString}`);
      const payload = (await res.json()) as WarrantyResponse;
      setData(payload);
      setLoading(false);
    };
    void load();
  }, [hasRequiredParams, queryString]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-[#080B14]">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Vehicle warranty check</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Verify engine, chassis and sold date from QR data.</p>

        {loading ? (
          <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">Checking warranty...</p>
        ) : !engine || !chassis || !soldAt ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
            Missing QR values. Scan a valid warranty QR.
          </div>
        ) : data && "valid" in data && data.valid ? (
          <div className="mt-6 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
            <p className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" /> Warranty record verified
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">Model: {data.vehicle.model_code || "-"}</p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">Color: {data.vehicle.color || "-"}</p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">Engine: {data.vehicle.engine_number || "-"}</p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">Chassis: {data.vehicle.chassis_number || "-"}</p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">Sold at: {data.vehicle.sold_at ? new Date(data.vehicle.sold_at).toLocaleString() : "-"}</p>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-5 w-5" />
              {"message" in (data || {}) ? (data as { message: string }).message : (data as { error: string } | null)?.error || "Warranty check failed"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
