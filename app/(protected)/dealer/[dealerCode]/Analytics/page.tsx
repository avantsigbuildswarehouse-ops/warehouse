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
import { requireRole } from "@/lib/auth/require-role";
import { supabaseAdmin } from "@/lib/supabase/admin";

type DealerVehicleRow = {
  id: string;
  dealer_code: string;
  model_code: string;
  engine_number: string;
  chassis_number: string;
  color: string | null;
  yom: string | null;
  version: string | null;
  price: number | string | null;
  issued_at: string | null;
};

type DealerSpareRow = {
  id: string;
  dealer_code: string;
  model_code: string;
  spare_code: string;
  serial_number: string;
  price?: number | string | null;
  issued_at: string | null;
};

type InvoiceRow = {
  id?: string | number;
  engine_no?: string | null;
  chassis_no?: string | null;
  total?: number | string | null;
  total_invoice?: number | string | null;
  calc_price?: number | string | null;
  base_price?: number | string | null;
  created_at?: string | null;
  issued_at?: string | null;
  invoice_date?: string | null;
  inserted_at?: string | null;
};

type AnalyticsData = {
  dealerCode: string;
  totals: {
    bikesSold: number;
    sparesSold: number;
    bikeSalesValue: number;
    spareSalesValue: number;
    bikeInventoryUnits: number;
    spareInventoryUnits: number;
    bikeInventoryValue: number;
    spareInventoryValue: number;
  };
  soldVehicles: Array<{
    key: string;
    modelCode: string;
    engineNumber: string;
    chassisNumber: string;
    soldValue: number;
    soldAt: string | null;
    source: "Customer" | "Company";
  }>;
  vehicleInventory: DealerVehicleRow[];
  spareInventory: DealerSpareRow[];
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

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

function pickInvoiceValue(invoice: InvoiceRow) {
  return toNumber(
    invoice.total ??
      invoice.total_invoice ??
      invoice.calc_price ??
      invoice.base_price
  );
}

function pickInvoiceDate(invoice: InvoiceRow) {
  return (
    invoice.created_at ??
    invoice.invoice_date ??
    invoice.issued_at ??
    invoice.inserted_at ??
    null
  );
}

async function getDealerAnalytics(dealerCode: string): Promise<AnalyticsData> {
  const [
    vehicleResult,
    spareResult,
    customerInvoiceResult,
    companyInvoiceResult,
  ] = await Promise.all([
    supabaseAdmin
      .schema("ASB showrooms")
      .from("dealer_vehicle_inventory")
      .select(
        "id, dealer_code, model_code, engine_number, chassis_number, color, yom, version, price, issued_at"
      )
      .eq("dealer_code", dealerCode)
      .order("issued_at", { ascending: false }),
    supabaseAdmin
      .schema("ASB showrooms")
      .from("dealer_spare_inventory")
      .select(
        "id, dealer_code, model_code, spare_code, serial_number, price, issued_at"
      )
      .eq("dealer_code", dealerCode)
      .order("issued_at", { ascending: false }),
    supabaseAdmin.from("Customer_Invoice").select("*"),
    supabaseAdmin.from("Company_Invoice").select("*"),
  ]);

  if (vehicleResult.error) {
    throw new Error(vehicleResult.error.message);
  }

  if (spareResult.error) {
    throw new Error(spareResult.error.message);
  }

  if (customerInvoiceResult.error) {
    throw new Error(customerInvoiceResult.error.message);
  }

  if (companyInvoiceResult.error) {
    throw new Error(companyInvoiceResult.error.message);
  }

  const vehicleInventory = (vehicleResult.data ?? []) as DealerVehicleRow[];
  const spareInventory = (spareResult.data ?? []) as DealerSpareRow[];
  const customerInvoices = (customerInvoiceResult.data ?? []) as InvoiceRow[];
  const companyInvoices = (companyInvoiceResult.data ?? []) as InvoiceRow[];

  const vehicleByEngine = new Map(
    vehicleInventory.map((vehicle) => [vehicle.engine_number, vehicle])
  );
  const vehicleByChassis = new Map(
    vehicleInventory.map((vehicle) => [vehicle.chassis_number, vehicle])
  );

  const soldVehicleMap = new Map<
    string,
    {
      key: string;
      modelCode: string;
      engineNumber: string;
      chassisNumber: string;
      soldValue: number;
      soldAt: string | null;
      source: "Customer" | "Company";
    }
  >();

  const attachInvoices = (
    invoices: InvoiceRow[],
    source: "Customer" | "Company"
  ) => {
    for (const invoice of invoices) {
      const matchedVehicle =
        (invoice.engine_no && vehicleByEngine.get(invoice.engine_no)) ||
        (invoice.chassis_no && vehicleByChassis.get(invoice.chassis_no)) ||
        null;

      if (!matchedVehicle) {
        continue;
      }

      const key = matchedVehicle.engine_number || matchedVehicle.chassis_number;

      if (soldVehicleMap.has(key)) {
        continue;
      }

      soldVehicleMap.set(key, {
        key,
        modelCode: matchedVehicle.model_code,
        engineNumber: matchedVehicle.engine_number,
        chassisNumber: matchedVehicle.chassis_number,
        soldValue: pickInvoiceValue(invoice),
        soldAt: pickInvoiceDate(invoice),
        source,
      });
    }
  };

  attachInvoices(customerInvoices, "Customer");
  attachInvoices(companyInvoices, "Company");

  const soldVehicles = Array.from(soldVehicleMap.values()).sort((a, b) => {
    if (!a.soldAt && !b.soldAt) return 0;
    if (!a.soldAt) return 1;
    if (!b.soldAt) return -1;
    return a.soldAt < b.soldAt ? 1 : -1;
  });

  return {
    dealerCode,
    totals: {
      bikesSold: soldVehicles.length,
      sparesSold: 0,
      bikeSalesValue: soldVehicles.reduce(
        (sum, vehicle) => sum + vehicle.soldValue,
        0
      ),
      spareSalesValue: 0,
      bikeInventoryUnits: vehicleInventory.length,
      spareInventoryUnits: spareInventory.length,
      bikeInventoryValue: vehicleInventory.reduce(
        (sum, vehicle) => sum + toNumber(vehicle.price),
        0
      ),
      spareInventoryValue: spareInventory.reduce(
        (sum, spare) => sum + toNumber(spare.price),
        0
      ),
    },
    soldVehicles,
    vehicleInventory,
    spareInventory,
  };
}

export default async function DealerAnalyticsPage(
  props: PageProps<"/dealer/[dealerCode]/Analytics">
) {
  await requireRole(["dealer-admin"]);

  const { dealerCode } = await props.params;

  let analytics: AnalyticsData | null = null;
  let error: string | null = null;

  try {
    analytics = await getDealerAnalytics(dealerCode);
  } catch (caughtError) {
    error =
      caughtError instanceof Error
        ? caughtError.message
        : "Failed to load dealer analytics";
  }

  if (error) {
    return (
      <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <Button asChild variant="outline">
            <Link href={`/dealer/${dealerCode}`}>
              <ArrowLeft className="mr-2 size-4" />
              Back to dealer home
            </Link>
          </Button>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/20 dark:bg-red-900/10">
            <p className="text-sm text-red-700 dark:text-red-400">
              Error: {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

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
                Dealer Analytics
              </Badge>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {analytics.dealerCode}
                </h1>
                <p className="max-w-2xl text-base text-slate-700 dark:text-slate-400">
                  Sales and inventory performance for bikes and spares in one
                  place.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={`/dealer/${dealerCode}`}>
                  <ArrowLeft className="mr-2 size-4" />
                  Dealer home
                </Link>
              </Button>
              <Button
                asChild
                className="rounded-xl shadow-md transition-all hover:-translate-y-0.5 dark:bg-sky-500 dark:text-white dark:hover:bg-sky-400"
              >
                <Link href={`/dealer/${dealerCode}/Request`}>Request stock</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-sky-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">
                Total Bikes Sold
              </CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-sky-100 p-2.5 dark:bg-sky-500/20">
                  <Bike className="size-6 text-sky-600 dark:text-sky-400" />
                </div>
                {formatNumber(analytics.totals.bikesSold)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-emerald-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,253,245,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">
                Total Bike Sales Value
              </CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-emerald-100 p-2.5 dark:bg-emerald-500/20">
                  <TrendingUp className="size-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                {formatCurrency(analytics.totals.bikeSalesValue)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-amber-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">
                Bike Inventory Value
              </CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-amber-100 p-2.5 dark:bg-amber-500/20">
                  <CircleDollarSign className="size-6 text-amber-600 dark:text-amber-400" />
                </div>
                {formatCurrency(analytics.totals.bikeInventoryValue)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-indigo-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,242,255,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">
                Total Spares Sold
              </CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-indigo-100 p-2.5 dark:bg-indigo-500/20">
                  <Wrench className="size-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                {formatNumber(analytics.totals.sparesSold)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Inventory Snapshot
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Current units and value currently assigned to this dealer.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/40">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Bikes in inventory
                    </p>
                    <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                      {formatNumber(analytics.totals.bikeInventoryUnits)}
                    </p>
                  </div>
                  <Badge variant="outline">{formatCurrency(analytics.totals.bikeInventoryValue)}</Badge>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/40">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Spares in inventory
                    </p>
                    <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                      {formatNumber(analytics.totals.spareInventoryUnits)}
                    </p>
                  </div>
                  <Badge variant="outline">{formatCurrency(analytics.totals.spareInventoryValue)}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Sales Coverage
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Bike sales are matched from invoice records using engine or
                chassis numbers.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
                {analytics.totals.bikesSold > 0
                  ? `Matched ${formatNumber(analytics.totals.bikesSold)} sold bike records for this dealer.`
                  : "No bike sales have been matched to this dealer yet."}
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300">
                Spare sales are currently shown as zero because this codebase
                does not yet store dealer spare-sale transactions.
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
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Spare sales value
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(analytics.totals.spareSalesValue)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Spare inventory value
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(analytics.totals.spareInventoryValue)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-white/10">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Total tracked value
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(
                    analytics.totals.bikeSalesValue +
                      analytics.totals.bikeInventoryValue +
                      analytics.totals.spareInventoryValue
                  )}
                </span>
              </div>
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
                Vehicles matched to customer and company invoice records.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {analytics.soldVehicles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No sold bike records matched for this dealer yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                          Model
                        </th>
                        <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                          Source
                        </th>
                        <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                          Engine No
                        </th>
                        <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                          Value
                        </th>
                        <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.soldVehicles.map((vehicle) => (
                        <tr
                          key={vehicle.key}
                          className="border-t dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="p-3 font-medium text-slate-900 dark:text-white">
                            {vehicle.modelCode}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {vehicle.source}
                          </td>
                          <td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-500">
                            {vehicle.engineNumber}
                          </td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(vehicle.soldValue)}
                          </td>
                          <td className="p-3 text-slate-500 dark:text-slate-400">
                            {vehicle.soldAt
                              ? new Date(vehicle.soldAt).toLocaleDateString()
                              : "N/A"}
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
                Inventory Breakdown
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Current issued stock by bikes and spares.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-6">
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-sky-100 p-2.5 dark:bg-sky-500/20">
                    <PackageOpen className="size-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Bike stock
                    </p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {formatNumber(analytics.vehicleInventory.length)} units
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-100 p-2.5 dark:bg-amber-500/20">
                    <Wrench className="size-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Spare stock
                    </p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {formatNumber(analytics.spareInventory.length)} units
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Most recent stock issue
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {(() => {
                    const latestDate = [
                      ...analytics.vehicleInventory.map((item) => item.issued_at),
                      ...analytics.spareInventory.map((item) => item.issued_at),
                    ]
                      .filter((value): value is string => Boolean(value))
                      .sort((a, b) => (a < b ? 1 : -1))[0];

                    return latestDate
                      ? new Date(latestDate).toLocaleDateString()
                      : "N/A";
                  })()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
