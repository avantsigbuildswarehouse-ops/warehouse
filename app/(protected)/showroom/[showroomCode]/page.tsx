
import Link from "next/link";
import {
  ArrowLeft,
  Bike,
  CircleDollarSign,
  PackageOpen,
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

type VehicleStock = {
  id: string;
  dealer_code: string;
  model_code: string;
  engine_number: string;
  chassis_number: string;
  color: string;
  yom: string;
  version: string;
  price: number;
  issued_at: string;
};

type SpareStock = {
  id: string;
  dealer_code: string;
  model_code: string;
  spare_code: string;
  serial_number: string;
  issued_at: string;
};

type StockData = {
  stats: {
    totalBikes: number;
    totalSpares: number;
    lastIssue: string | null;
  };
  vehicleStock: VehicleStock[];
  spareStock: SpareStock[];
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

async function getShowroomStock(showroomCode: string): Promise<StockData> {
  try {
    const { data: vehicles, error: vehicleError } = await supabaseAdmin
      .schema("ASB showrooms")
      .from("showroom_vehicle_inventory")
      .select("*")
      .eq("showroom_code", showroomCode);

    if (vehicleError) throw vehicleError;

    const { data: spares, error: spareError } = await supabaseAdmin
      .schema("ASB showrooms")
      .from("showroom_spare_inventory")
      .select("*")
      .eq("showroom_code", showroomCode);

    if (spareError) throw spareError;

    const totalBikes = (vehicles || []).length;
    const totalSpares = (spares || []).length;
    const lastIssue =
      [...(vehicles || []), ...(spares || [])]
        .map((item: { issued_at?: string | null }) => item.issued_at)
        .filter(Boolean)
        .sort()
        .pop() || null;

    return {
      stats: {
        totalBikes,
        totalSpares,
        lastIssue,
      },
      vehicleStock: (vehicles || []) as VehicleStock[],
      spareStock: (spares || []) as SpareStock[],
    };
  } catch (error) {
    console.error("Error fetching dealer stock:", error);
    throw new Error("Failed to fetch dealer stock");
  }
}

export default async function ShowroomStockPage({
  params,
}: {
  params: Promise<{ showroomCode: string }>;
}) {
  await requireRole(["showroom-admin"]);

  const { showroomCode } = await params;

  let stockData: StockData | null = null;
  let error: string | null = null;

  try {
    stockData = await getShowroomStock(showroomCode);
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : "Something went wrong";
  }

  if (error) {
    return (
      <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <Button asChild variant="outline">
            <Link href="/dealer">
              <ArrowLeft className="mr-2 size-4" />
              Back
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

  if (!stockData) {
    return (
      <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-slate-500">No data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">

        {/* Header Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-sky-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.72))] p-8 shadow-sm backdrop-blur transition-colors dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
          <div className="absolute -right-20 -top-20 size-64 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
          <Badge
            variant="outline"
            className="mb-6 w-fit border-sky-200/60 bg-sky-50/60 text-sky-700 backdrop-blur dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
          >
            Dealer Admin
          </Badge>
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
                {showroomCode}
              </h1>
              <p className="max-w-xl text-base text-slate-700 dark:text-slate-400">
                Dealer inventory and stock issuance summary.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button
                asChild
                className="rounded-xl shadow-md transition-all hover:-translate-y-0.5 dark:bg-sky-500 dark:text-white dark:hover:bg-sky-400"
              >
                <Link href="/dealer/Inventory">Request Stock</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-sky-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">
                Total Bikes
              </CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-sky-100 p-2.5 dark:bg-sky-500/20">
                  <Bike className="size-6 text-sky-600 dark:text-sky-400" />
                </div>
                {formatNumber(stockData.stats.totalBikes)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-green-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,253,250,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">
                Unique Models
              </CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-green-100 p-2.5 dark:bg-green-500/20">
                  <PackageOpen className="size-6 text-green-600 dark:text-green-400" />
                </div>
                {formatNumber(
                  new Set(stockData.vehicleStock.map((v) => v.model_code))
                    .size
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-amber-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">
                Total Spares
              </CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-amber-100 p-2.5 dark:bg-amber-500/20">
                  <Wrench className="size-6 text-amber-600 dark:text-amber-400" />
                </div>
                {formatNumber(stockData.stats.totalSpares)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-indigo-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,242,255,0.72))] shadow-sm backdrop-blur transition-all hover:shadow-md dark:border-white/5 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.8),rgba(15,23,42,0.9))]">
            <CardHeader className="p-6">
              <CardDescription className="font-semibold text-slate-500 dark:text-slate-400">
                Last Issue Date
              </CardDescription>
              <CardTitle className="mt-2 flex items-center gap-3 text-lg font-bold text-slate-900 dark:text-white">
                <div className="rounded-xl bg-indigo-100 p-2.5 dark:bg-indigo-500/20">
                  <CircleDollarSign className="size-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                {stockData.stats.lastIssue
                  ? new Date(stockData.stats.lastIssue).toLocaleDateString()
                  : "N/A"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Vehicles Section */}
        <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Vehicle Stock Issued
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              All vehicles issued to this dealer
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            {stockData.vehicleStock.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No vehicles issued yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        Model Code
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        Color
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        Version
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        Engine No
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        Chassis No
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        YOM
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        Price
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        Issued At
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockData.vehicleStock.map((vehicle) => (
                      <tr
                        key={vehicle.id}
                        className="border-t dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          {vehicle.model_code}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {vehicle.color}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {vehicle.version}
                        </td>
                        <td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-500">
                          {vehicle.engine_number}
                        </td>
                        <td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-500">
                          {vehicle.chassis_number}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {vehicle.yom}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          {formatNumber(vehicle.price)}
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">
                          {new Date(vehicle.issued_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spares Section */}
        <Card className="border-slate-200/60 bg-white/80 shadow-md backdrop-blur-lg dark:border-white/10 dark:bg-slate-900/40">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
              Spare Stock Issued
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              All spare serials issued to this dealer
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            {stockData.spareStock.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No spares issued yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        Model Code
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        Spare Code
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        Serial Number
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        Issued At
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockData.spareStock.map((spare) => (
                      <tr
                        key={spare.id}
                        className="border-t dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          {spare.model_code}
                        </td>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          {spare.spare_code}
                        </td>
                        <td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-500">
                          {spare.serial_number}
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">
                          {new Date(spare.issued_at).toLocaleDateString()}
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
    </div>
  );
}
