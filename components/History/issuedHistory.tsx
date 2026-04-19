"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Receipt,
  Truck,
  FileCheck,
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

import {
  generateIssueDocument,
  IssueDocData,
} from "@/lib/utils/pdf-generator";

type Row = {
  type: "Bike" | "Spare";
  target: "Showroom" | "Dealer";
  target_code: string;
  model_code: string;
  identifier: string;
  price: number;
  issued_at: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export default function IssuedHistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [targetFilter, setTargetFilter] = useState<
    "all" | "showroom" | "dealer"
  >("all");

  const [typeFilter, setTypeFilter] = useState<
    "all" | "Bike" | "Spare"
  >("all");

  useEffect(() => {
    setLoading(true);

    fetch(`/api/warehouse/issued-history?type=${targetFilter}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.items || []);
        setLoading(false);
      });
  }, [targetFilter]);

  const filteredRows = useMemo(() => {
    if (typeFilter === "all") return rows;
    return rows.filter((r) => r.type === typeFilter);
  }, [rows, typeFilter]);

  const summary = useMemo(() => {
    const bikes = filteredRows.filter(
      (r) => r.type === "Bike"
    ).length;

    const spares = filteredRows.filter(
      (r) => r.type === "Spare"
    ).length;

    const totalValue = filteredRows.reduce(
      (a, b) => a + Number(b.price || 0),
      0
    );

    return {
      total: filteredRows.length,
      bikes,
      spares,
      totalValue,
    };
  }, [filteredRows]);

  const generateDoc = (
    row: Row,
    type: IssueDocData["type"]
  ) => {
    const doc = generateIssueDocument({
      type,
      referenceNo: `ISS-${Date.now()}`,
      date: row.issued_at,
      targetName: `${row.target} (${row.target_code})`,
      targetAddress: "-",
      items: [
        {
          model_code: row.model_code,
          name: row.type,
          identifier: row.identifier,
          price: row.price,
        },
      ],
    });

    doc.save(`${type}_${row.identifier}.pdf`);
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        
        {/* HEADER */}
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <Badge variant="outline" className="w-fit">
            Warehouse operations
          </Badge>

          <div>
            <h1 className="text-3xl font-semibold tracking-tight dark:text-white">
              Issued inventory history
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Track all issued bikes and spares and regenerate documents.
            </p>
          </div>

          {/* TARGET FILTER */}
          <div className="flex gap-2 pt-2">
            <Button
              variant={targetFilter === "all" ? "default" : "outline"}
              onClick={() => setTargetFilter("all")}
            >
              All
            </Button>

            <Button
              variant={targetFilter === "showroom" ? "default" : "outline"}
              onClick={() => setTargetFilter("showroom")}
            >
              Showrooms
            </Button>

            <Button
              variant={targetFilter === "dealer" ? "default" : "outline"}
              onClick={() => setTargetFilter("dealer")}
            >
              Dealers
            </Button>
          </div>

          {/* TYPE FILTER */}
          <div className="flex gap-2">
            <Button
              variant={typeFilter === "all" ? "default" : "outline"}
              onClick={() => setTypeFilter("all")}
            >
              All Types
            </Button>

            <Button
              variant={typeFilter === "Bike" ? "default" : "outline"}
              onClick={() => setTypeFilter("Bike")}
            >
              Bikes
            </Button>

            <Button
              variant={typeFilter === "Spare" ? "default" : "outline"}
              onClick={() => setTypeFilter("Spare")}
            >
              Spares
            </Button>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="dark:border-white/10 dark:bg-slate-900/60">
            <CardHeader>
              <CardDescription>Total Issued</CardDescription>
              <CardTitle className="text-3xl">
                {formatNumber(summary.total)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="dark:border-white/10 dark:bg-slate-900/60">
            <CardHeader>
              <CardDescription>Bikes Issued</CardDescription>
              <CardTitle className="text-3xl">
                {formatNumber(summary.bikes)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="dark:border-white/10 dark:bg-slate-900/60">
            <CardHeader>
              <CardDescription>Spares Issued</CardDescription>
              <CardTitle className="text-3xl">
                {formatNumber(summary.spares)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="dark:border-white/10 dark:bg-slate-900/60">
            <CardHeader>
              <CardDescription>Total Value</CardDescription>
              <CardTitle className="text-3xl">
                {formatNumber(summary.totalValue)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* TABLE */}
        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle>Issued items</CardTitle>
            <CardDescription>
              All issued bikes and spares with document regeneration.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="p-6 text-sm text-slate-500">
                Loading issued history...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                No issued records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Model</th>
                      <th className="px-3 py-2">Identifier</th>
                      <th className="px-3 py-2">Target</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Documents</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((row, i) => (
                      <tr
                        key={i}
                        className="rounded-2xl bg-slate-50 dark:bg-slate-800/40"
                      >
                        <td className="px-3 py-3">{row.type}</td>
                        <td className="px-3 py-3">{row.model_code}</td>
                        <td className="px-3 py-3 font-mono">
                          {row.identifier}
                        </td>
                        <td className="px-3 py-3">
                          {row.target} ({row.target_code})
                        </td>
                        <td className="px-3 py-3">
                          {new Date(
                            row.issued_at
                          ).toLocaleDateString()}
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => generateDoc(row,"Quotation")}>
                              <FileText className="w-4 h-4 mr-1" />
                              Quotation
                            </Button>

                            <Button size="sm" variant="outline" onClick={() => generateDoc(row,"Invoice")}>
                              <FileCheck className="w-4 h-4 mr-1" />
                              Invoice
                            </Button>

                            <Button size="sm" variant="outline" onClick={() => generateDoc(row,"Receipt")}>
                              <Receipt className="w-4 h-4 mr-1" />
                              Receipt
                            </Button>

                            <Button size="sm" variant="outline" onClick={() => generateDoc(row,"Delivery Note")}>
                              <Truck className="w-4 h-4 mr-1" />
                              Delivery
                            </Button>
                          </div>
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
