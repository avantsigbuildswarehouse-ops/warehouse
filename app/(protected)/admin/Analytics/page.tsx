import { BarChart3, Bike, Building, Building2, CircleDollarSign, PackageOpen, ShoppingBag, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/require-role";
import { getAdminAnalytics } from "@/lib/analytics";

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

export default async function AdminAnalyticsPage() {
  await requireRole(["admin"]);

  const analytics = await getAdminAnalytics();

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900/60">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
          <Badge
            variant="outline"
            className="mb-6 w-fit border-slate-200 bg-slate-50 text-slate-700 backdrop-blur dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300"
          >
            Warehouse Analytics
          </Badge>
          <div className="relative z-10 space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
              Warehouse Performance Overview
            </h1>
            <p className="max-w-3xl text-base text-slate-700 dark:text-slate-400">
              End-to-end visibility across dealer and showroom network size, warehouse stock, assigned inventory, and completed sales.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Dealers" value={formatNumber(analytics.totals.totalDealers)} icon={Building2} />
          <MetricCard label="Showrooms" value={formatNumber(analytics.totals.totalShowrooms)} icon={Building} />
          <MetricCard label="Warehouse Vehicles" value={formatNumber(analytics.totals.warehouseVehicleUnits)} icon={Bike} />
          <MetricCard label="Warehouse Spares" value={formatNumber(analytics.totals.warehouseSpareUnits)} icon={Wrench} />
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Bikes Sold" value={formatNumber(analytics.totals.totalBikesSold)} icon={ShoppingBag} />
          <MetricCard label="Spares Sold" value={formatNumber(analytics.totals.totalSparesSold)} icon={PackageOpen} />
          <MetricCard label="Total Sales Value" value={formatCurrency(analytics.totals.totalSalesValue)} icon={CircleDollarSign} />
          <MetricCard
            label="Warehouse Stock Value"
            value={formatCurrency(analytics.totals.warehouseVehicleValue + analytics.totals.warehouseSpareValue)}
            icon={BarChart3}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <SnapshotCard
            title="Assigned Dealer Stock"
            lines={[
              `Vehicles: ${formatNumber(analytics.totals.assignedDealerVehicles)}`,
              `Spares: ${formatNumber(analytics.totals.assignedDealerSpares)}`,
            ]}
          />
          <SnapshotCard
            title="Assigned Showroom Stock"
            lines={[
              `Vehicles: ${formatNumber(analytics.totals.assignedShowroomVehicles)}`,
              `Spares: ${formatNumber(analytics.totals.assignedShowroomSpares)}`,
            ]}
          />
          <SnapshotCard
            title="Warehouse Value Split"
            lines={[
              `Vehicles: ${formatCurrency(analytics.totals.warehouseVehicleValue)}`,
              `Spares: ${formatCurrency(analytics.totals.warehouseSpareValue)}`,
            ]}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Recent Sales
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Latest completed sales across dealers and showrooms.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {analytics.recentSales.length === 0 ? (
                <EmptyState text="No sales have been recorded yet." />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        {["Target", "Buyer", "Bikes", "Spares", "Value", "Date"].map((header) => (
                          <th key={header} className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.recentSales.map((sale) => (
                        <tr key={sale.saleId} className="border-t dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-medium text-slate-900 dark:text-white">
                            {sale.targetType}/{sale.targetCode}
                          </td>
                          <td className="p-3 text-slate-600 capitalize dark:text-slate-400">
                            {sale.buyerType}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{formatNumber(sale.bikeCount)}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{formatNumber(sale.spareCount)}</td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">{formatCurrency(sale.total)}</td>
                          <td className="p-3 text-slate-500 dark:text-slate-400">
                            {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Top Sales Partners
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Dealers and showrooms ranked by recorded sales value.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {analytics.topPartners.length === 0 ? (
                <EmptyState text="No partner sales data available yet." />
              ) : (
                analytics.topPartners.map((partner) => (
                  <div
                    key={`${partner.targetType}-${partner.targetCode}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {partner.targetCode}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {partner.targetType} • {formatNumber(partner.salesCount)} sale(s)
                      </p>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(partner.salesValue)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Vehicle Model Snapshot
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Arrived and warehouse quantities by vehicle model.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {analytics.vehicleModels.length === 0 ? (
              <EmptyState text="No vehicle models available." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      {["Model", "Code", "Arrived", "Warehouse", "Price"].map((header) => (
                        <th key={header} className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.vehicleModels.map((model) => (
                      <tr key={model.model_code} className="border-t dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-medium text-slate-900 dark:text-white">{model.model_name}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{model.model_code}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{formatNumber(Number(model.arrived_quantity || 0))}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{formatNumber(Number(model.warehouse_quantity || 0))}</td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">{formatCurrency(Number(model.price || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
}: {
  label: string;
  value: string;
  icon: typeof Bike;
}) {
  return (
    <Card className="border-slate-200/60 bg-white/90 shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
      <CardHeader className="p-6">
        <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">{label}</CardDescription>
        <CardTitle className="mt-2 flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white">
          <div className="rounded-xl bg-sky-100 p-2.5 dark:bg-sky-500/20">
            <Icon className="size-6 text-sky-600 dark:text-sky-400" />
          </div>
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function SnapshotCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-6">
        {lines.map((line) => (
          <div key={line} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:text-slate-300">
            {line}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {text}
    </div>
  );
}
