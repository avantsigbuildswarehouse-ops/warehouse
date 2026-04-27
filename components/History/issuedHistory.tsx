"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Receipt,
  Truck,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Bike,
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
import PaginationControls from "@/components/ui/pagination-controls";

import {
  generateIssueDocument,
  IssueDocData,
} from "@/lib/utils/pdf-generator";

type Item = {
  type: "Bike" | "Spare";
  target: "Showroom" | "Dealer";
  target_code: string;
  model_code: string;
  identifier: string;
  price: number;
  issued_at: string;
};

type Group = {
  key: string;
  target: "Showroom" | "Dealer";
  target_code: string;
  date: string;
  items: Item[];
  totalValue: number;
  bikeCount: number;
  spareCount: number;
  latestIssuedAt: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export default function IssuedHistoryPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetFilter, setTargetFilter] = useState<"all" | "showroom" | "dealer">("all");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetch(`/api/warehouse/issued-history?type=${targetFilter}&page=${currentPage}&limit=${pageSize}`)
      .then((r) => r.json())
      .then((data) => {
        setGroups(data.groups || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotalGroups(data.pagination.total);
        }
        setLoading(false);
      });
  }, [targetFilter, currentPage]);

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) {
      setLoading(true);
      setCurrentPage(page);
    }
  }

  function changeFilter(filter: "all" | "showroom" | "dealer") {
    setLoading(true);
    setTargetFilter(filter);
    setCurrentPage(1);
  }

  const summary = useMemo(() => {
    const allItems = groups.flatMap((g) => g.items);
    return {
      totalGroups: groups.length,
      bikes: allItems.filter((i) => i.type === "Bike").length,
      spares: allItems.filter((i) => i.type === "Spare").length,
      totalValue: allItems.reduce((a, b) => a + Number(b.price || 0), 0),
    };
  }, [groups]);

  function toggleExpand(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function generateGroupDoc(group: Group, type: IssueDocData["type"]) {
    const doc = generateIssueDocument({
      type,
      referenceNo: `ASB-${group.date}-${group.target_code}`,
      date: group.latestIssuedAt,
      targetName: `${group.target} (${group.target_code})`,
      targetAddress: "-",
      items: group.items.map((item) => ({
        model_code: item.model_code,
        name: item.type === "Bike" ? `Bike — ${item.model_code}` : `Spare — ${item.model_code}`,
        identifier: item.identifier,
        price: item.price,
      })),
    });
    doc.save(`${type}_${group.target_code}_${group.date}.pdf`);
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <Badge variant="outline" className="w-fit">
            Warehouse Operations
          </Badge>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight dark:text-white">
              Issued Inventory History
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Grouped by destination and date. Expand a row to view items and generate documents.
            </p>
          </div>

          {/* FILTER */}
          <div className="flex gap-2 pt-1">
            {(["all", "showroom", "dealer"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={targetFilter === f ? "default" : "outline"}
                onClick={() => changeFilter(f)}
                className="capitalize"
              >
                {f === "all" ? "All" : f === "showroom" ? "Showrooms" : "Dealers"}
              </Button>
            ))}
          </div>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Issue Batches", value: summary.totalGroups },
            { label: "Bikes Issued", value: summary.bikes },
            { label: "Spares Issued", value: summary.spares },
            { label: "Total Value", value: summary.totalValue },
          ].map((s) => (
            <Card key={s.label} className="dark:border-white/10 dark:bg-slate-900/60">
              <CardHeader>
                <CardDescription className="dark:text-slate-400">{s.label}</CardDescription>
                <CardTitle className="text-3xl dark:text-white">
                  {formatNumber(s.value)}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* GROUPED TABLE */}
        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="dark:text-white">Issue Batches</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Each row is a batch of items issued to the same destination on the same day.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                Loading issued history...
              </div>
            ) : groups.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                No issued records found.
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => {
                  const isExpanded = expandedKeys.has(group.key);
                  return (
                    <div
                      key={group.key}
                      className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden"
                    >
                      {/* GROUP HEADER ROW */}
                      <div
                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                        onClick={() => toggleExpand(group.key)}
                      >
                        <div className="flex items-center gap-4 flex-wrap">
                          {/* Target badge */}
                          <Badge
                            variant="outline"
                            className={
                              group.target === "Dealer"
                                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                                : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300"
                            }
                          >
                            {group.target}
                          </Badge>

                          <span className="font-semibold text-slate-800 dark:text-white">
                            {group.target_code}
                          </span>

                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {new Date(group.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>

                          {/* Item counts */}
                          <div className="flex items-center gap-2">
                            {group.bikeCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-900/30 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                                <Bike className="w-3 h-3" />
                                {group.bikeCount} {group.bikeCount === 1 ? "bike" : "bikes"}
                              </span>
                            )}
                            {group.spareCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                <Wrench className="w-3 h-3" />
                                {group.spareCount} {group.spareCount === 1 ? "spare" : "spares"}
                              </span>
                            )}
                          </div>

                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            LKR {formatNumber(group.totalValue)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 ml-4">
                          {/* Doc buttons — always visible */}
                          <div className="hidden md:flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Quotation")} className="dark:border-white/10 dark:text-slate-300">
                              <FileText className="w-3.5 h-3.5 mr-1" /> Quotation
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Invoice")} className="dark:border-white/10 dark:text-slate-300">
                              <FileCheck className="w-3.5 h-3.5 mr-1" /> Invoice
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Receipt")} className="dark:border-white/10 dark:text-slate-300">
                              <Receipt className="w-3.5 h-3.5 mr-1" /> Receipt
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Delivery Note")} className="dark:border-white/10 dark:text-slate-300">
                              <Truck className="w-3.5 h-3.5 mr-1" /> Delivery
                            </Button>
                          </div>

                          {/* Expand toggle */}
                          <div className="text-slate-400 dark:text-slate-500">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* EXPANDED ITEMS */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 dark:border-white/10">
                          {/* Mobile doc buttons */}
                          <div className="flex flex-wrap gap-2 p-4 border-b border-slate-100 dark:border-white/5 md:hidden">
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Quotation")} className="dark:border-white/10 dark:text-slate-300">
                              <FileText className="w-3.5 h-3.5 mr-1" /> Quotation
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Invoice")} className="dark:border-white/10 dark:text-slate-300">
                              <FileCheck className="w-3.5 h-3.5 mr-1" /> Invoice
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Receipt")} className="dark:border-white/10 dark:text-slate-300">
                              <Receipt className="w-3.5 h-3.5 mr-1" /> Receipt
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => generateGroupDoc(group, "Delivery Note")} className="dark:border-white/10 dark:text-slate-300">
                              <Truck className="w-3.5 h-3.5 mr-1" /> Delivery
                            </Button>
                          </div>

                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/20">
                              <tr>
                                <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</th>
                                <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Model</th>
                                <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Identifier</th>
                                <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Price</th>
                                <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.items.map((item, idx) => (
                                <tr
                                  key={idx}
                                  className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                                >
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                      item.type === "Bike"
                                        ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                    }`}>
                                      {item.type === "Bike"
                                        ? <Bike className="w-3 h-3" />
                                        : <Wrench className="w-3 h-3" />}
                                      {item.type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.model_code}</td>
                                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{item.identifier}</td>
                                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                    {item.price ? `LKR ${formatNumber(item.price)}` : "—"}
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                    {new Date(item.issued_at).toLocaleTimeString("en-US", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              totalItemsLabel={`${totalGroups} total batches`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}