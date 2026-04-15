import Link from "next/link";
import {
  Bike,
  CircleDollarSign,
  PackageOpen,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { requireRole } from "@/lib/auth/require-role";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSpareInventoryDetails,
  getVehicleInventoryDetails,
  getVehicleModels,
} from "@/lib/warehouse/admin-data";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AdminPage() {
  await requireRole(["admin"]);

  const [vehicleInventory, spareInventory, models] = await Promise.all([
    getVehicleInventoryDetails(),
    getSpareInventoryDetails(),
    getVehicleModels(),
  ]);

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900/60">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
          <Badge
            variant="outline"
            className="mb-6 w-fit border-slate-200 bg-slate-50 text-slate-700 backdrop-blur dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300"
          >
            Warehouse Admin
          </Badge>
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
                Admin Control Center
              </h1>
              <p className="max-w-xl text-base text-slate-700 dark:text-slate-400">
                Review live warehouse totals, manage vehicle intake and spares,
                and administer access control securely.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button asChild className="rounded-xl shadow-md transition-all hover:-translate-y-0.5 dark:bg-sky-500 dark:text-white dark:hover:bg-sky-400">
                <Link href="/admin/Inventory">Manage Vehicles</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl shadow-sm transition-all hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-700/50">
                <Link href="/admin/Spares">Manage Spares</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-sky-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">Total Bike Units</CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-sky-100 p-2.5 dark:bg-sky-500/20">
                  <Bike className="size-6 text-sky-600 dark:text-sky-400" />
                </div>
                {formatNumber(vehicleInventory.summary.totalUnits)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-teal-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,250,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">Vehicle Models</CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-teal-100 p-2.5 dark:bg-teal-500/20">
                  <ShieldCheck className="size-6 text-teal-600 dark:text-teal-400" />
                </div>
                {formatNumber(models.length)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-amber-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">Spare Serials</CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-amber-100 p-2.5 dark:bg-amber-500/20">
                  <Wrench className="size-6 text-amber-600 dark:text-amber-400" />
                </div>
                {formatNumber(spareInventory.summary.totalUnits)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-indigo-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,242,255,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">Total Listed Value</CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-indigo-100 p-2.5 dark:bg-indigo-500/20">
                  <CircleDollarSign className="size-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                {formatNumber(
                  vehicleInventory.summary.totalValue +
                    spareInventory.summary.totalValue
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Detailed Snapshot Section */}
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Vehicle Catalog Snapshot</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Current admin-visible models and their stock counts.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {models.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No vehicle models have been added yet.
                </div>
              ) : (
                models.slice(0, 6).map((model) => (
                  <div
                    key={model.model_code}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white/60 p-4 transition-all hover:bg-white hover:shadow-sm dark:border-white/5 dark:bg-slate-800/40 dark:hover:bg-slate-800/70"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {model.model_name}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {model.model_code}
                      </p>
                    </div>

                    <Badge variant="outline" className="h-fit bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {formatNumber(Number(model.quantity ?? 0))} units
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Latest Spare Visibility</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Recent spare units currently available in the warehouse.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {spareInventory.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No spare stock has been recorded yet.
                </div>
              ) : (
                spareInventory.items.slice(0, 6).map((item) => (
                  <div
                    key={`${item.spare_code}-${item.serial_number}`}
                    className="group relative flex flex-col justify-between gap-1 rounded-2xl border border-slate-200/60 bg-white/60 p-5 transition-all hover:bg-white hover:shadow-sm dark:border-white/5 dark:bg-slate-800/40 dark:hover:bg-slate-800/70"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {item.spare_name}
                        </p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {item.model_name} • <span className="uppercase tracking-wider">{item.spare_code}</span>
                        </p>
                      </div>

                      <div className="rounded-full bg-slate-100 p-2 dark:bg-slate-800">
                        <PackageOpen className="size-4 text-slate-500 dark:text-slate-400" />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-400" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300 flex-1 truncate">
                        S/N: <span className="text-slate-900 dark:text-white font-mono text-xs">{item.serial_number}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
