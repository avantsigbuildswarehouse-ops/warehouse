"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Layers,
  Package,
  ShieldCheck,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type RequestItem = {
  id: string;
  reference_no: string;
  model_code: string;
  engine_number?: string;
  chassis_number?: string;
  color?: string;
  spare_code?: string;
  spare_name?: string;
  serial_number?: string;
  price: number;
};

type GroupedRequest = {
  reference_no: string;
  item_type: "Bike" | "Spare";
  items_count: number;
  total_value: number;
  status: string;
  remarks?: string;
  requested_at: string;
  items: RequestItem[];
};

type StatusConfig = {
  icon: LucideIcon;
  bg: string;
  text: string;
  label: string;
};

const getStatusConfig = (status: string): StatusConfig => {
  const configs: Record<string, StatusConfig> = {
    PENDING: { icon: Clock, bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", label: "Pending" },
    APPROVED: { icon: CheckCircle2, bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", label: "Approved" },
    HOLD: { icon: Clock, bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", label: "On Hold" },
    ISSUED: { icon: Truck, bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", label: "Issued" },
    REJECTED: { icon: AlertCircle, bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", label: "Rejected" },
  };
  return configs[status?.toUpperCase()] || configs.PENDING;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export default function RequestStatus({
  targetCode,
  targetType,
}: {
  targetCode: string;
  targetType: "dealer" | "showroom";
}) {
  const [requests, setRequests] = useState<GroupedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setError(null);
        const key = targetType === "dealer" ? "dealerCode" : "showroomCode";
        const apiBase = targetType === "dealer" ? "/api/dealers/reqStats" : "/api/showrooms/reqStats";
        const res = await fetch(`${apiBase}?${key}=${encodeURIComponent(targetCode)}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load request history");
        }
        setRequests(data.requests || []);
      } catch (caughtError) {
        setRequests([]);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to load request history"
        );
      } finally {
        setLoading(false);
      }
    };
    void fetchRequests();
  }, [targetCode, targetType]);

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => request.reference_no.toLowerCase().includes(search.trim().toLowerCase())),
    [requests, search],
  );

  const stats = useMemo(
    () => ({
      total: filteredRequests.length,
      pending: filteredRequests.filter((request) => request.status === "PENDING").length,
      approved: filteredRequests.filter((request) => ["APPROVED", "ISSUED", "COMPLETED"].includes(request.status)).length,
      rejected: filteredRequests.filter((request) => ["REJECTED", "CANCELLED"].includes(request.status)).length,
      totalValue: filteredRequests.reduce((sum, request) => sum + request.total_value, 0),
    }),
    [filteredRequests],
  );

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent dark:border-white/20 dark:border-t-transparent" />
              Loading request history...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-500/15" />
            <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/15" />
          </div>

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="w-fit">
                {targetType === "dealer" ? "Dealer" : "Showroom"} portal
              </Badge>
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Request history</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  All stock requests for <span className="font-semibold text-slate-900 dark:text-white">{targetCode}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full sm:w-72">
                <input
                  placeholder="Search by reference..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:ring-sky-400/10"
                />
              </div>
              <Button asChild className="h-10 rounded-xl bg-sky-500 font-semibold text-white hover:bg-sky-600">
                <Link href={`/${targetType}/${targetCode}/Request`}>
                  <Package className="mr-2 size-4" />
                  New request
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Total Requests" value={stats.total} icon={Layers} variant="sky" />
          <StatCard label="Pending" value={stats.pending} icon={Clock} variant="amber" />
          <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} variant="green" />
          <StatCard label="Rejected" value={stats.rejected} icon={AlertCircle} variant="red" />
          <StatCard label="Total Value" value={`Rs ${formatMoney(stats.totalValue)}`} icon={Package} variant="indigo" />
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/40">
          <CardHeader className="border-b border-slate-100 px-6 py-5 dark:border-white/5">
            <CardTitle className="text-lg font-semibold">Requests</CardTitle>
            <CardDescription>Expand any request to see the exact items.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredRequests.length === 0 ? (
              <div className="p-10 sm:p-14">
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/30 dark:text-slate-300">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <ShieldCheck className="h-6 w-6 text-slate-500 dark:text-slate-300" />
                  </div>
                  <p className="font-medium">No requests found</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Try a different reference search or create a new request.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredRequests.map((request) => {
                  const status = getStatusConfig(request.status);
                  const isExpanded = expandedId === request.reference_no;
                  const requestDate = new Date(request.requested_at);
                  return (
                    <Collapsible
                      key={request.reference_no}
                      open={isExpanded}
                      onOpenChange={(open) => setExpandedId(open ? request.reference_no : null)}
                    >
                      <div className={cn("transition-colors", isExpanded ? "bg-slate-50/70 dark:bg-slate-950/20" : "hover:bg-slate-50/40 dark:hover:bg-white/[0.01]")}>
                        <CollapsibleTrigger asChild>
                          <div className="cursor-pointer px-6 py-5">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <div className="flex items-start gap-4">
                                <div
                                  className={cn(
                                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset",
                                    request.item_type === "Bike"
                                      ? "bg-sky-500/10 text-sky-600 ring-sky-500/15 dark:text-sky-300 dark:ring-sky-400/15"
                                      : "bg-violet-500/10 text-violet-600 ring-violet-500/15 dark:text-violet-300 dark:ring-violet-400/15",
                                  )}
                                >
                                  {request.item_type === "Bike" ? <Truck className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
                                </div>

                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                      {request.reference_no}
                                    </span>
                                    <Badge className={cn("h-6 border-none px-2.5 text-[11px] font-semibold", status.bg, status.text)}>
                                      <status.icon className="mr-1 h-3.5 w-3.5" />
                                      {status.label}
                                    </Badge>
                                    <Badge variant="outline" className="h-6 text-[11px]">
                                      {request.item_type === "Bike" ? "Vehicles" : "Spares"}
                                    </Badge>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="inline-flex items-center gap-1">
                                      <Calendar className="h-3.5 w-3.5" />
                                      {requestDate.toLocaleDateString()}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <Layers className="h-3.5 w-3.5" />
                                      {request.items_count} item{request.items_count === 1 ? "" : "s"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-4 md:justify-end">
                                <div className="text-left md:text-right">
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total</p>
                                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                                    Rs {formatMoney(request.total_value)}
                                  </p>
                                </div>
                                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                                  isExpanded
                                    ? "border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/70"
                                    : "border-transparent bg-transparent dark:border-transparent"
                                )}>
                                  <ChevronDown
                                    className={cn(
                                      "h-5 w-5 text-slate-500 transition-transform duration-200 dark:text-slate-400",
                                      isExpanded && "rotate-180",
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-6 pb-6 pt-1">
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/40">
                              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-white/5 md:flex-row md:items-center md:justify-between">
                                <div className="space-y-0.5">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Requested items</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {request.items_count} item{request.items_count === 1 ? "" : "s"} • Rs {formatMoney(request.total_value)}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline">Ref: {request.reference_no}</Badge>
                                  <Badge variant="outline">{request.item_type}</Badge>
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="min-w-[680px] w-full text-sm">
                                  <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
                                    <tr>
                                      <th className="px-4 py-3 text-left font-semibold">Item</th>
                                      <th className="px-4 py-3 text-left font-semibold">Identifiers</th>
                                      <th className="px-4 py-3 text-right font-semibold">Price</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {request.items.map((item, idx) => (
                                      <tr key={`${item.reference_no}-${idx}`} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.03]">
                                        <td className="px-4 py-3">
                                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                                            {item.model_code || item.spare_code}
                                          </p>
                                          <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {item.color || item.spare_name || "Standard"}
                                          </p>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                                          <div className="grid gap-1">
                                            {item.engine_number ? <div>ENG: {item.engine_number}</div> : null}
                                            {item.chassis_number ? <div>CHS: {item.chassis_number}</div> : null}
                                            {item.serial_number ? <div>SER: {item.serial_number}</div> : null}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                                          Rs {formatMoney(item.price)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {request.remarks ? (
                                <div className="border-t border-slate-100 p-4 dark:border-white/5">
                                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                      Remarks
                                    </p>
                                    <p className="mt-1 text-sm text-amber-900 dark:text-amber-200">{request.remarks}</p>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant: "sky" | "amber" | "green" | "red" | "indigo";
}) {
  const styles = {
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  };

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-slate-900/60">
      <CardHeader className="pb-3">
        <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </CardDescription>
        <div className="mt-2 flex items-center justify-between">
          <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</CardTitle>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", styles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
