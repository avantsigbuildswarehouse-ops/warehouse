import Link from "next/link";
import {
  ArrowLeft,
  Bike,
  CircleDollarSign,
  PackageOpen,
  TrendingUp,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PartnerAnalyticsData } from "@/lib/analytics";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PartnerAnalyticsDashboard({
  analytics,
}: {
  analytics: PartnerAnalyticsData;
}) {
  const label = analytics.targetType === "dealer" ? "Dealer" : "Showroom";
  const baseHref = `/${analytics.targetType}/${analytics.targetCode}`;

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-sky-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.72))] p-8 shadow-sm backdrop-blur transition-colors dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
          <div className="absolute -right-20 -top-20 size-64 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Badge
                variant="outline"
                className="w-fit border-sky-200/60 bg-sky-50/60 text-sky-700 backdrop-blur dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
              >
                {label} Analytics
              </Badge>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {analytics.targetCode}
                </h1>
                <p className="max-w-2xl text-base text-slate-700 dark:text-slate-400">
                  Sales and inventory performance for bikes and spares in one place.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={baseHref}>
                  <ArrowLeft className="mr-2 size-4" />
                  {label} home
                </Link>
              </Button>
              <Button
                asChild
                className="rounded-xl shadow-md transition-all hover:-translate-y-0.5 dark:bg-sky-500 dark:text-white dark:hover:bg-sky-400"
              >
                <Link href={`${baseHref}/Request`}>Request stock</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Bikes Sold" value={formatNumber(analytics.totals.bikesSold)} icon={Bike} tone="sky" />
          <MetricCard label="Bike Sales Value" value={formatCurrency(analytics.totals.bikeSalesValue)} icon={TrendingUp} tone="green" />
          <MetricCard label="Total Spares Sold" value={formatNumber(analytics.totals.sparesSold)} icon={Wrench} tone="indigo" />
          <MetricCard label="Spare Sales Value" value={formatCurrency(analytics.totals.spareSalesValue)} icon={CircleDollarSign} tone="amber" />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Inventory Snapshot
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Current units and value assigned to this {analytics.targetType}.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-6">
              <MiniStat
                label="Bikes in inventory"
                value={formatNumber(analytics.totals.bikeInventoryUnits)}
                badge={formatCurrency(analytics.totals.bikeInventoryValue)}
              />
              <MiniStat
                label="Spares in inventory"
                value={formatNumber(analytics.totals.spareInventoryUnits)}
                badge={formatCurrency(analytics.totals.spareInventoryValue)}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Sales Coverage
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Completed sales recorded through the sales order flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
                {analytics.totals.bikesSold > 0
                  ? `Recorded ${formatNumber(analytics.totals.bikesSold)} sold bike unit(s).`
                  : "No bike sales have been recorded yet."}
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800 dark:border-violet-900/30 dark:bg-violet-950/20 dark:text-violet-300">
                {analytics.totals.sparesSold > 0
                  ? `Recorded ${formatNumber(analytics.totals.sparesSold)} sold spare unit(s).`
                  : "No spare sales have been recorded yet."}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Quick Totals
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                High-level value totals across sales and stock.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <QuickTotal label="Bike inventory value" value={formatCurrency(analytics.totals.bikeInventoryValue)} />
              <QuickTotal label="Spare inventory value" value={formatCurrency(analytics.totals.spareInventoryValue)} />
              <QuickTotal
                label="Total tracked sales"
                value={formatCurrency(analytics.totals.bikeSalesValue + analytics.totals.spareSalesValue)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Sold Bikes
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Vehicles sold through customer and company sales.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <SalesTable
                emptyText={`No sold bike records found for this ${analytics.targetType} yet.`}
                headers={["Model", "Color", "Source", "Engine No", "Value", "Date"]}
                rows={analytics.soldVehicles.map((vehicle) => [
                  vehicle.modelCode,
                  vehicle.color || "-",
                  vehicle.source,
                  vehicle.engineNumber,
                  formatCurrency(vehicle.soldValue),
                  vehicle.soldAt ? new Date(vehicle.soldAt).toLocaleDateString() : "N/A",
                ])}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Sold Spares
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Spare items sold through customer and company sales.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <SalesTable
                emptyText={`No sold spare records found for this ${analytics.targetType} yet.`}
                headers={["Model", "Spare Code", "Serial", "Source", "Value", "Date"]}
                rows={analytics.soldSpares.map((spare) => [
                  spare.modelCode,
                  spare.spareCode,
                  spare.serialNumber,
                  spare.source,
                  formatCurrency(spare.soldValue),
                  spare.soldAt ? new Date(spare.soldAt).toLocaleDateString() : "N/A",
                ])}
              />
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Current Inventory Breakdown
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Current assigned stock by bikes and spares.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 md:grid-cols-2">
            <InventorySummaryTile
              icon={PackageOpen}
              label="Bike stock"
              value={`${formatNumber(analytics.vehicleInventory.length)} units`}
              tone="sky"
            />
            <InventorySummaryTile
              icon={Wrench}
              label="Spare stock"
              value={`${formatNumber(analytics.spareInventory.length)} units`}
              tone="amber"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Bike;
  tone: "sky" | "green" | "indigo" | "amber";
}) {
  const toneClass = {
    sky: "border-sky-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.72))]",
    green: "border-emerald-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,253,245,0.72))]",
    indigo: "border-indigo-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,242,255,0.72))]",
    amber: "border-amber-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.72))]",
  };
  return (
    <Card className={`${toneClass[tone]} shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]`}>
      <CardHeader className="p-6">
        <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">{label}</CardDescription>
        <CardTitle className="mt-2 flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white">
          <div className="rounded-xl bg-white/70 p-2.5 dark:bg-white/10">
            <Icon className="size-6" />
          </div>
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function MiniStat({ label, value, badge }: { label: string; value: string; badge: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/40">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
        <Badge variant="outline">{badge}</Badge>
      </div>
    </div>
  );
}

function QuickTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function SalesTable({
  emptyText,
  headers,
  rows,
}: {
  emptyText: string;
  headers: string[];
  rows: string[][];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 dark:bg-slate-800">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row[0]}-${index}`}
              className="border-t dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={`${cell}-${cellIndex}`}
                  className="p-3 text-slate-600 dark:text-slate-400 first:font-medium first:text-slate-900 first:dark:text-white"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventorySummaryTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof PackageOpen;
  label: string;
  value: string;
  tone: "sky" | "amber";
}) {
  const style =
    tone === "sky"
      ? "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"
      : "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400";

  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${style}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
