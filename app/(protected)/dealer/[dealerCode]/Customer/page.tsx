import Link from "next/link";
import { ArrowLeft, Bike, Wrench } from "lucide-react";

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
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/* ---------------- TYPES ---------------- */

type Customer = {
  id: string;
  first_name: string;
  phone_number: string;
  nic: string;
};

type SoldVehicle = {
  id: string;
  model_code: string;
  engine_number: string;
  chassis_number: string;
  price: number;
  issued_at: string;
  sold_at: string;
  customers: Customer | null;
};

type SoldSpare = {
  id: string;
  model_code: string;
  spare_code: string;
  serial_number: string;
  price: number;
  sold_at: string;
};

type StockData = {
  stats: {
    soldVehicles: number;
    soldSpares: number;
    totalRevenue: number;
    uniquecustomers: number;
    lastSale: string | null;
  };
  soldVehiclesList: SoldVehicle[];
  soldSparesList: SoldSpare[];
};

const supabaseAdmin = getSupabaseAdmin();

/* ---------------- HELPERS ---------------- */

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

/* ---------------- DATA ---------------- */

async function getDealerSoldStock(dealerCode: string): Promise<StockData> {
  // 1. Fetch Vehicles from "ASB showrooms" schema
  const { data: vehicles, error: vErr } = await supabaseAdmin
    .schema("ASB showrooms")
    .from("dealer_vehicle_inventory")
    .select(`
      id,
      model_code,
      engine_number,
      chassis_number,
      price,
      issued_at,
      sold_at,
      sold_customer_id
    `)
    .not("sold_customer_id", "is", null)
    .eq("dealer_code", dealerCode);

  if (vErr) throw vErr;

  // 2. Fetch Spares from "ASB showrooms" schema
  const { data: spares, error: sErr } = await supabaseAdmin
    .schema("ASB showrooms")
    .from("dealer_spare_inventory")
    .select(`
      id,
      model_code,
      spare_code,
      serial_number,
      price,
      sold_at,
      sold_customer_id
    `)
    .not("sold_customer_id", "is", null)
    .eq("dealer_code", dealerCode);

  if (sErr) throw sErr;

  // 3. Fetch customers from "public" schema
  // Collect unique customer IDs from the sold vehicles
  const customerIds = Array.from(
    new Set((vehicles || []).map((v) => v.sold_customer_id).filter(Boolean))
  );

  let customersMap: Record<string, Customer> = {};
  
  if (customerIds.length > 0) {
    const { data: customers, error: cErr } = await supabaseAdmin
      .schema("public")
      .from("Customers") // Defaults to public schema
      .select("id, first_name, phone_number, nic")
      .in("id", customerIds);

    if (cErr) throw cErr;

    // Convert to a map for O(1) lookup
    customersMap = (customers || []).reduce((acc, curr) => {
      acc[curr.id] = curr;
      return acc;
    }, {} as Record<string, Customer>);
  }

  /* ---------------- NORMALIZE ---------------- */

  const soldVehiclesList: SoldVehicle[] = (vehicles || []).map((v: any) => ({
    id: v.id,
    model_code: v.model_code,
    engine_number: v.engine_number,
    chassis_number: v.chassis_number,
    price: v.price,
    issued_at: v.issued_at,
    sold_at: v.sold_at,
    customers: v.sold_customer_id ? customersMap[v.sold_customer_id] || null : null,
  }));

  const soldSparesList: SoldSpare[] = (spares || []).map((s: any) => ({
    id: s.id,
    model_code: s.model_code,
    spare_code: s.spare_code,
    serial_number: s.serial_number,
    price: s.price || 0,
    sold_at: s.sold_at,
  }));

  /* ---------------- STATS ---------------- */

  const totalRevenue =
    soldVehiclesList.reduce((sum, v) => sum + (v.price || 0), 0) +
    soldSparesList.reduce((sum, s) => sum + (s.price || 0), 0);

  const uniquecustomersCount = new Set(
    soldVehiclesList.map((v) => v.customers?.id).filter(Boolean)
  ).size;

  const lastSale =
    [...soldVehiclesList, ...soldSparesList]
      .map((i) => i.sold_at)
      .filter(Boolean)
      .sort()
      .pop() || null;

  return {
    stats: {
      soldVehicles: soldVehiclesList.length,
      soldSpares: soldSparesList.length,
      totalRevenue,
      uniquecustomers: uniquecustomersCount,
      lastSale,
    },
    soldVehiclesList,
    soldSparesList,
  };
}

/* ---------------- PAGE ---------------- */

export default async function DealerStockPage({
  params,
}: {
  params: Promise<{ dealerCode: string }>;
}) {
  await requireRole(["dealer-admin"]);

  const { dealerCode } = await params;
  const stockData = await getDealerSoldStock(dealerCode);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8">

        {/* HEADER */}
        <div className="rounded-3xl border border-sky-200/60 bg-white/80 p-8 backdrop-blur dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex justify-between">
            <div>
              <Badge className="mb-3 bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                Dealer Sales View
              </Badge>

              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
                {dealerCode}
              </h1>

              <p className="text-slate-600 dark:text-slate-400">
                Sold vehicles + spares overview
              </p>
            </div>

            <Button asChild variant="outline">
              <Link href="/dealer">
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Link>
            </Button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid gap-5 md:grid-cols-4">
          <Card className="bg-white/80 dark:bg-slate-900/40">
            <CardHeader>
              <CardDescription>Vehicles Sold</CardDescription>
              <CardTitle className="flex items-center gap-2">
                <Bike className="text-sky-500" />
                {stockData.stats.soldVehicles}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/40">
            <CardHeader>
              <CardDescription>Spares Sold</CardDescription>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="text-amber-500" />
                {stockData.stats.soldSpares}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/40">
            <CardHeader>
              <CardDescription>Total Revenue</CardDescription>
              <CardTitle>{formatNumber(stockData.stats.totalRevenue)}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/40">
            <CardHeader>
              <CardDescription>customers</CardDescription>
              <CardTitle>{stockData.stats.uniquecustomers}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* VEHICLES TABLE */}
        <Card className="bg-white/80 dark:bg-slate-900/40">
          <CardHeader>
            <CardTitle>Sold Vehicles</CardTitle>
          </CardHeader>

          <CardContent>
            <table className="w-full text-sm text-slate-900 dark:text-slate-200">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="p-3 text-left">Customer</th>
                  <th className="p-3 text-left">Phone Number</th>
                  <th className="p-3 text-left">Model</th>
                  <th className="p-3 text-left">Engine</th>
                  <th className="p-3 text-left">Price</th>
                </tr>
              </thead>

              <tbody>
                {stockData.soldVehiclesList.map((v) => (
                  <tr key={v.id} className="border-t dark:border-slate-800">
                    <td className="p-3">{v.customers?.first_name || "N/A"}</td>
                    <td className="p-3">{v.customers?.phone_number || "N/A"}</td>
                    <td className="p-3">{v.model_code}</td>
                    <td className="p-3">{v.engine_number}</td>
                    <td className="p-3">{formatNumber(v.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* SPARES TABLE */}
        <Card className="bg-white/80 dark:bg-slate-900/40">
          <CardHeader>
            <CardTitle>Sold Spares</CardTitle>
          </CardHeader>

          <CardContent>
            <table className="w-full text-sm text-slate-900 dark:text-slate-200">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="p-3 text-left">Model</th>
                  <th className="p-3 text-left">Spare Code</th>
                  <th className="p-3 text-left">Serial</th>
                  <th className="p-3 text-left">Price</th>
                </tr>
              </thead>

              <tbody>
                {stockData.soldSparesList.map((s) => (
                  <tr key={s.id} className="border-t dark:border-slate-800">
                    <td className="p-3">{s.model_code}</td>
                    <td className="p-3">{s.spare_code}</td>
                    <td className="p-3">{s.serial_number}</td>
                    <td className="p-3">{formatNumber(s.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}