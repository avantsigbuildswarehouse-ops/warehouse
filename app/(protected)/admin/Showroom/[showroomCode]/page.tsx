"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default function DealerStockPage() {
  const params = useParams();
  const showroomCode = params.showroomCode as string;

  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDealerStock() {
      try {
        setLoading(true);
        const res = await fetch(`/api/showrooms/${showroomCode}/stock`);
        if (!res.ok) throw new Error("Failed to fetch showroom stock");
        const data: StockData = await res.json();
        setStockData(data);
      } catch (err: any) {
        setError(err.message ?? "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    if (showroomCode) fetchDealerStock();
  }, [showroomCode]);

  const issueHistory = [
    ...(stockData?.vehicleStock ?? []).map((r) => ({
      type: "Bike Stock Issued",
      detail: r.model_code,
      date: r.issued_at,
    })),
    ...(stockData?.spareStock ?? []).map((r) => ({
      type: "Spare Stock Issued",
      detail: r.spare_code,
      date: r.issued_at,
    })),
  ].sort((a, b) => (a.date > b.date ? -1 : 1));

  return (
    <div className="min-h-full bg-slate-50 dark:bg-[#080B14]">
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">

        {/* HEADER */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">
                Showroom Stock ({showroomCode})
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Stock issued to showroom
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              {showroomCode}
            </Badge>
          </div>
        </div>

        {loading && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading stock data...
          </p>
        )}

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {!loading && !error && stockData && (
          <>
            {/* STATS */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="dark:bg-slate-900/60 dark:border-white/10">
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">Total Bikes</p>
                  <p className="text-3xl font-bold dark:text-white">
                    {stockData.stats.totalBikes}
                  </p>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-900/60 dark:border-white/10">
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">Total Spares</p>
                  <p className="text-3xl font-bold dark:text-white">
                    {stockData.stats.totalSpares}
                  </p>
                </CardContent>
              </Card>

              <Card className="dark:bg-slate-900/60 dark:border-white/10">
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-500">Last Issue</p>
                  <p className="text-lg font-semibold dark:text-white">
                    {stockData.stats.lastIssue
                      ? new Date(stockData.stats.lastIssue).toLocaleDateString()
                      : "N/A"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* BIKE STOCK */}
            <Card className="dark:bg-slate-900/60 dark:border-white/10">
              <CardHeader>
                <CardTitle className="dark:text-white">
                  Bike Stock Issued
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="text-left p-3">Model Code</th>
                        <th className="text-left p-3">Color</th>
                        <th className="text-left p-3">Version</th>
                        <th className="text-left p-3">Engine No</th>
                        <th className="text-left p-3">Chassis No</th>
                        <th className="text-left p-3">YOM</th>
                        <th className="text-left p-3">Price</th>
                        <th className="text-left p-3">Issued At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockData.vehicleStock.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="p-3 text-center text-slate-500"
                          >
                            No bike stock found
                          </td>
                        </tr>
                      ) : (
                        stockData.vehicleStock.map((row, i) => (
                          <tr
                            key={i}
                            className="border-t dark:border-white/10"
                          >
                            <td className="p-3 font-medium">{row.model_code}</td>
                            <td className="p-3">{row.color}</td>
                            <td className="p-3">{row.version}</td>
                            <td className="p-3 text-slate-500">{row.engine_number}</td>
                            <td className="p-3 text-slate-500">{row.chassis_number}</td>
                            <td className="p-3">{row.yom}</td>
                            <td className="p-3 font-semibold">
                              {row.price.toLocaleString()}
                            </td>
                            <td className="p-3 text-slate-500">
                              {new Date(row.issued_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* SPARES STOCK */}
            <Card className="dark:bg-slate-900/60 dark:border-white/10">
              <CardHeader>
                <CardTitle className="dark:text-white">
                  Spare Parts Issued
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="text-left p-3">Spare Code</th>
                        <th className="text-left p-3">Model Code</th>
                        <th className="text-left p-3">Serial No</th>
                        <th className="text-left p-3">Issued At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockData.spareStock.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-3 text-center text-slate-500"
                          >
                            No spare parts found
                          </td>
                        </tr>
                      ) : (
                        stockData.spareStock.map((row, i) => (
                          <tr
                            key={i}
                            className="border-t dark:border-white/10"
                          >
                            <td className="p-3 font-medium">{row.spare_code}</td>
                            <td className="p-3">{row.model_code}</td>
                            <td className="p-3 text-slate-500">{row.serial_number}</td>
                            <td className="p-3 text-slate-500">
                              {new Date(row.issued_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ISSUE HISTORY */}
            <Card className="dark:bg-slate-900/60 dark:border-white/10">
              <CardHeader>
                <CardTitle className="dark:text-white">
                  Issue History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {issueHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">No history found</p>
                ) : (
                  issueHistory.map((item, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-200 p-4 dark:border-white/10"
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-semibold dark:text-white">
                            {item.type}
                          </p>
                          <p className="text-sm text-slate-500">
                            {item.detail}
                          </p>
                        </div>
                        <Badge>
                          {new Date(item.date).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}

      </div>
    </div>
  );
}