"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, CircleAlert, PauseCircle, RefreshCw, Truck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AdminRequest = {
  referenceNo: string;
  requestKind: "dealer" | "showroom";
  targetCode: string;
  itemType: "Bike" | "Spare";
  status: "PENDING" | "APPROVED" | "HOLD" | "ISSUED" | "REJECTED";
  requestedAt: string;
  expiresAt: string;
  itemsCount: number;
  totalValue: number;
  remarks: string | null;
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  APPROVED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  HOLD: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  ISSUED: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  REJECTED: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function IssueStockForm() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningRef, setRunningRef] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/warehouse/requests");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load request queue");
      setRequests(data.requests || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load request queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const activeRequests = useMemo(
    () => requests.filter((request) => ["PENDING", "APPROVED", "HOLD"].includes(request.status)),
    [requests],
  );

  const handleAction = async (referenceNo: string, action: "approve" | "hold" | "reject" | "issue") => {
    setRunningRef(referenceNo);
    setMessage(null);
    try {
      const res = await fetch("/api/warehouse/requests/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceNo, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} request`);
      setMessage(
        action === "hold"
          ? "Request hold extended by 3 days."
          : action === "issue"
          ? `Issued ${data.issuedCount || 0} unit(s).`
          : `Request ${action}d successfully.`,
      );
      await loadRequests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setRunningRef(null);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60 transition-colors">
          <Badge variant="outline" className="w-fit border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 text-slate-700 bg-slate-50">
            Warehouse request queue
          </Badge>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Approve and Issue Requests
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Requests auto-expire in 3 days. Use Hold to extend by another 3 days, or issue in one click after manual payment confirmation.
            </p>
          </div>
          <div className="pt-2">
            <Button variant="outline" onClick={() => void loadRequests()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh queue
            </Button>
          </div>
        </div>

        {message && (
          <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <CardContent className="pt-6 text-sm text-slate-700 dark:text-slate-300">{message}</CardContent>
          </Card>
        )}

        {loading ? (
          <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <CardContent className="pt-6 text-sm text-slate-600 dark:text-slate-300">Loading request queue...</CardContent>
          </Card>
        ) : activeRequests.length === 0 ? (
          <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <CardContent className="pt-6 text-sm text-slate-600 dark:text-slate-300">
              No active requests to process.
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <CardHeader>
              <CardTitle>Pending / Approved Requests</CardTitle>
              <CardDescription>Approve, hold, reject, or directly issue approved requests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeRequests.map((request) => {
                const isExpired = new Date(request.expiresAt).getTime() <= Date.now();
                const disabled = runningRef === request.referenceNo;
                return (
                  <div
                    key={`${request.requestKind}-${request.itemType}-${request.referenceNo}`}
                    className="rounded-xl border border-slate-200 p-4 dark:border-white/10"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{request.referenceNo}</span>
                          <Badge className={cn("border-none", statusStyles[request.status])}>{request.status}</Badge>
                          <Badge variant="outline">{request.requestKind.toUpperCase()}</Badge>
                          <Badge variant="outline">{request.itemType}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Target: {request.targetCode} • {request.itemsCount} item(s) • Rs {request.totalValue.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Requested: {new Date(request.requestedAt).toLocaleString()} • Expires: {new Date(request.expiresAt).toLocaleString()}
                        </p>
                        {request.remarks && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">Remarks: {request.remarks}</p>
                        )}
                        {isExpired && (
                          <p className="text-xs text-red-600 dark:text-red-400">Expired. Refresh queue to auto-release.</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={disabled || request.status === "APPROVED"} onClick={() => void handleAction(request.referenceNo, "approve")}>
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" disabled={disabled} onClick={() => void handleAction(request.referenceNo, "hold")}>
                          <PauseCircle className="mr-1 h-4 w-4" />
                          Hold +3 Days
                        </Button>
                        <Button size="sm" disabled={disabled || !["APPROVED", "HOLD"].includes(request.status)} onClick={() => void handleAction(request.referenceNo, "issue")}>
                          <Truck className="mr-1 h-4 w-4" />
                          Issue
                        </Button>
                        <Button size="sm" variant="destructive" disabled={disabled} onClick={() => void handleAction(request.referenceNo, "reject")}>
                          <XCircle className="mr-1 h-4 w-4" />
                          Reject/Release
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-base">Policy Reminders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Requests are held for 3 days from request time.</p>
            <p className="flex items-center gap-2"><PauseCircle className="h-4 w-4" /> Hold action extends validity by another 3 days.</p>
            <p className="flex items-center gap-2"><CircleAlert className="h-4 w-4" /> Expired/rejected requests are released back to AVAILABLE stock.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}