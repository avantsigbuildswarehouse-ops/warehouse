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
    <div className="min-h-full bg-[linear-gradient(180deg,rgba(239,246,255,0.9)_0%,rgba(236,253,245,0.6)_100%)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-sky-200/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(219,234,254,0.78),rgba(204,251,241,0.68))] p-6 shadow-[0_20px_60px_rgba(14,116,144,0.08)]">
          <Badge
            variant="outline"
            className="mb-4 w-fit border-sky-200 bg-white/70 text-sky-800"
          >
            Warehouse admin
          </Badge>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Admin control center
              </h1>
              <p className="max-w-3xl text-sm text-slate-700">
                Review live warehouse totals, jump into vehicle and spare intake,
                and keep the catalog visible only to admin users.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/admin/Inventory">Manage vehicles</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/Spares">Manage spares</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-sky-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.72))] shadow-sm">
            <CardHeader>
              <CardDescription>Total bike units</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <Bike className="size-5 text-sky-600" />
                {formatNumber(vehicleInventory.summary.totalUnits)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-teal-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,250,0.72))] shadow-sm">
            <CardHeader>
              <CardDescription>Vehicle models</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <ShieldCheck className="size-5 text-teal-600" />
                {formatNumber(models.length)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-amber-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.72))] shadow-sm">
            <CardHeader>
              <CardDescription>Spare serials</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <Wrench className="size-5 text-amber-600" />
                {formatNumber(spareInventory.summary.totalUnits)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-indigo-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,242,255,0.72))] shadow-sm">
            <CardHeader>
              <CardDescription>Total listed value</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <CircleDollarSign className="size-5 text-indigo-600" />
                {formatNumber(
                  vehicleInventory.summary.totalValue +
                    spareInventory.summary.totalValue
                )}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Vehicle catalog snapshot</CardTitle>
              <CardDescription>
                Current admin-visible models and their stock counts.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {models.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  No vehicle models have been added yet.
                </div>
              ) : (
                models.slice(0, 6).map((model) => (
                  <div
                    key={model.model_code}
                    className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.8))] p-4"
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
                        {formatNumber(Number(model.quantity ?? 0))} units
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle>Latest spare visibility</CardTitle>
              <CardDescription>
                Spare units currently available in the warehouse.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {spareInventory.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  No spare stock has been recorded yet.
                </div>
              ) : (
                spareInventory.items.slice(0, 6).map((item) => (
                  <div
                    key={`${item.spare_code}-${item.serial_number}`}
                    className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.8))] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {item.spare_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.model_name} | {item.spare_code}
                        </p>
                      </div>

                      <PackageOpen className="mt-0.5 size-4 text-slate-400" />
                    </div>

                    <p className="mt-3 text-sm text-slate-600">
                      Serial: {item.serial_number}
                    </p>
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
