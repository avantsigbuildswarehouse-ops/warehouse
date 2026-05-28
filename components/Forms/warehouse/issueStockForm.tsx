"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  FileText,
  Loader2,
  PauseCircle,
  RefreshCw,
  Send,
  Truck,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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

type ShowroomTarget = {
  showroom_code: string;
  city: string | null;
  state: string | null;
  address: string | null;
  is_active: boolean | null;
};

type DealerTarget = {
  dealer_code: string;
  business_name: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  is_active: boolean | null;
};

type AvailableBike = {
  model_code: string;
  model_name: string | null;
  engine_number: string;
  chassis_number: string;
  color: string | null;
  yom: string | null;
  version: string | null;
  price: number | string | null;
};

type AvailableSpare = {
  model_code: string;
  spare_code: string;
  spare_name: string | null;
  serial_number: string;
  price: number | string | null;
};

type DispatchTargetKind = "showroom" | "dealer";
type DispatchItemType = "Bike" | "Spare";

type DispatchDocumentItem = {
  type: DispatchItemType;
  model_code: string;
  identifier: string;
  price: number;
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  APPROVED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  HOLD: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  ISSUED: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  REJECTED: "bg-red-500/10 text-red-600 dark:text-red-400",
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function readError(response: Response, fallback: string) {
  return response
    .json()
    .then((data: { error?: string }) => data.error || fallback)
    .catch(() => fallback);
}

export default function IssueStockForm() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningRef, setRunningRef] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [showrooms, setShowrooms] = useState<ShowroomTarget[]>([]);
  const [dealers, setDealers] = useState<DealerTarget[]>([]);
  const [availableBikes, setAvailableBikes] = useState<AvailableBike[]>([]);
  const [availableSpares, setAvailableSpares] = useState<AvailableSpare[]>([]);
  const [dispatchTargetKind, setDispatchTargetKind] = useState<DispatchTargetKind>("showroom");
  const [dispatchTargetCode, setDispatchTargetCode] = useState("");
  const [dispatchItemType, setDispatchItemType] = useState<DispatchItemType>("Bike");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [dispatchLoading, setDispatchLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);

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

  const loadDispatchData = useCallback(async () => {
    setDispatchLoading(true);
    try {
      const [showroomResponse, dealerResponse, bikesResponse, sparesResponse] = await Promise.all([
        fetch("/api/showrooms"),
        fetch("/api/dealers?limit=1000"),
        fetch("/api/warehouse/available-bikes"),
        fetch("/api/warehouse/available-spares"),
      ]);

      if (!showroomResponse.ok) throw new Error(await readError(showroomResponse, "Failed to load showrooms"));
      if (!dealerResponse.ok) throw new Error(await readError(dealerResponse, "Failed to load dealers"));
      if (!bikesResponse.ok) throw new Error(await readError(bikesResponse, "Failed to load available vehicles"));
      if (!sparesResponse.ok) throw new Error(await readError(sparesResponse, "Failed to load available spares"));

      const showroomData = (await showroomResponse.json()) as ShowroomTarget[];
      const dealerData = (await dealerResponse.json()) as DealerTarget[];
      const bikeData = (await bikesResponse.json()) as { items?: AvailableBike[] };
      const spareData = (await sparesResponse.json()) as { items?: AvailableSpare[] };

      setShowrooms(showroomData.filter((showroom) => showroom.is_active !== false));
      setDealers(dealerData.filter((dealer) => dealer.is_active !== false));
      setAvailableBikes(bikeData.items ?? []);
      setAvailableSpares(spareData.items ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load direct dispatch data");
    } finally {
      setDispatchLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
    void loadDispatchData();
  }, [loadDispatchData, loadRequests]);

  useEffect(() => {
    setDispatchTargetCode("");
  }, [dispatchTargetKind]);

  useEffect(() => {
    setSelectedItems([]);
  }, [dispatchItemType]);

  const activeRequests = useMemo(
    () => requests.filter((request) => ["PENDING", "APPROVED", "HOLD"].includes(request.status)),
    [requests]
  );

  const dispatchTargets = dispatchTargetKind === "showroom" ? showrooms : dealers;
  const dispatchItems = dispatchItemType === "Bike" ? availableBikes : availableSpares;
  const selectedDispatchItems = useMemo(() => {
    const selected = new Set(selectedItems);
    return dispatchItemType === "Bike"
      ? availableBikes.filter((bike) => selected.has(bike.engine_number))
      : availableSpares.filter((spare) => selected.has(spare.serial_number));
  }, [availableBikes, availableSpares, dispatchItemType, selectedItems]);

  const selectedDispatchValue = selectedDispatchItems.reduce(
    (sum, item) => sum + toNumber(item.price),
    0
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
          : `Request ${action}d successfully.`
      );
      await Promise.all([loadRequests(), loadDispatchData()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setRunningRef(null);
    }
  };

  const toggleSelectedItem = (identifier: string) => {
    setSelectedItems((current) =>
      current.includes(identifier)
        ? current.filter((item) => item !== identifier)
        : [...current, identifier]
    );
  };

  const generateDispatchDocuments = async (
    targetKind: DispatchTargetKind,
    targetCode: string,
    documentItems: DispatchDocumentItem[]
  ) => {
    const createdAt = new Date().toISOString();
    const dispatchId = `DIRECT-${targetCode}-${Date.now()}`;
    const totalValue = documentItems.reduce((sum, item) => sum + item.price, 0);

    if (targetKind === "dealer") {
      const [
        { default: generateDealerQuotationPdf },
        { default: generateDealerInvoicePdf },
        { default: generateDealerReceiptPdf },
        { default: generateDealerDeliveryNotePdf },
      ] = await Promise.all([
        import("@/lib/utils/dealer/dealerQuotation"),
        import("@/lib/utils/dealer/dealerInvoice"),
        import("@/lib/utils/dealer/dealerReceipt"),
        import("@/lib/utils/dealer/dealerDeliveryNote"),
      ]);

      const commonData = {
        id: dispatchId,
        created_at: createdAt,
        dealer_code: targetCode,
        items: documentItems,
        base_price: totalValue,
        discount: 0,
        total_value: totalValue,
      };

      await generateDealerQuotationPdf(commonData);
      await generateDealerInvoicePdf(commonData);
      await generateDealerReceiptPdf({
        id: dispatchId,
        created_at: createdAt,
        dealer_code: targetCode,
        invoice_no: `DIRECT-INV-${dispatchId}`,
        quotation_no: `DIRECT-QUOT-${dispatchId}`,
        amount_paid: totalValue,
        balance_due: 0,
      });
      await generateDealerDeliveryNotePdf({
        id: dispatchId,
        created_at: createdAt,
        dealer_code: targetCode,
        items: documentItems,
        reference_no: dispatchId,
        delivery_method: "Warehouse direct dispatch",
      });
      return;
    }

    const [
      { default: generateShowroomQuotationPdf },
      { default: generateShowroomInvoicePdf },
      { default: generateShowroomReceiptPdf },
      { default: generateShowroomDeliveryNotePdf },
    ] = await Promise.all([
      import("@/lib/utils/showroom/showroomQuotation"),
      import("@/lib/utils/showroom/showroomInvoice"),
      import("@/lib/utils/showroom/showroomReceipt"),
      import("@/lib/utils/showroom/showroomDeliveryNote"),
    ]);

    const commonData = {
      id: dispatchId,
      created_at: createdAt,
      showroom_code: targetCode,
      items: documentItems,
      base_price: totalValue,
      discount: 0,
      total_value: totalValue,
    };

    await generateShowroomQuotationPdf(commonData);
    await generateShowroomInvoicePdf(commonData);
    await generateShowroomReceiptPdf({
      id: dispatchId,
      created_at: createdAt,
      showroom_code: targetCode,
      invoice_no: `DIRECT-INV-${dispatchId}`,
      quotation_no: `DIRECT-QUOT-${dispatchId}`,
      amount_paid: totalValue,
      balance_due: 0,
    });
    await generateShowroomDeliveryNotePdf({
      id: dispatchId,
      created_at: createdAt,
      showroom_code: targetCode,
      items: documentItems,
      reference_no: dispatchId,
      delivery_method: "Warehouse direct dispatch",
    });
  };

  const handleDirectDispatch = async () => {
    if (!dispatchTargetCode) {
      setMessage("Choose a showroom or dealer before dispatching.");
      return;
    }

    if (selectedItems.length === 0) {
      setMessage("Select at least one available vehicle or spare.");
      return;
    }

    const documentItems: DispatchDocumentItem[] =
      dispatchItemType === "Bike"
        ? (selectedDispatchItems as AvailableBike[]).map((bike) => ({
            type: "Bike",
            model_code: bike.model_code,
            identifier: bike.engine_number,
            price: toNumber(bike.price),
          }))
        : (selectedDispatchItems as AvailableSpare[]).map((spare) => ({
            type: "Spare",
            model_code: spare.spare_code,
            identifier: spare.serial_number,
            price: toNumber(spare.price),
          }));

    setDispatching(true);
    setMessage(null);

    try {
      const response = await fetch("/api/warehouse/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: dispatchTargetKind === "showroom" ? "ASB_Showroom" : "Dealer",
          targetCode: dispatchTargetCode,
          itemType: dispatchItemType,
          items: selectedItems,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Direct dispatch failed");

      await generateDispatchDocuments(dispatchTargetKind, dispatchTargetCode, documentItems);
      setMessage(
        `Dispatched ${result.count || selectedItems.length} ${dispatchItemType.toLowerCase()} item(s) and generated documents.`
      );
      setSelectedItems([]);
      await Promise.all([loadRequests(), loadDispatchData()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Direct dispatch failed");
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900/60">
          <Badge variant="outline" className="w-fit border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Warehouse dispatch center
          </Badge>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Approve, Issue, and Direct Dispatch
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Process request-based issues, or dispatch available warehouse stock directly to a showroom or dealer with documents generated.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => void Promise.all([loadRequests(), loadDispatchData()])}
              disabled={loading || dispatchLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh queue and stock
            </Button>
          </div>
        </div>

        {message && (
          <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <CardContent className="pt-6 text-sm text-slate-700 dark:text-slate-300">{message}</CardContent>
          </Card>
        )}

        <Card className="border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle>Showroom Dispatch / Dealer Dispatch</CardTitle>
            <CardDescription>
              Issue available vehicles or spares directly without a showroom/dealer request. This uses the same warehouse issue records and generated PDFs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Dispatch Type</Label>
                <select
                  value={dispatchTargetKind}
                  onChange={(event) => setDispatchTargetKind(event.target.value as DispatchTargetKind)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                >
                  <option value="showroom">Showroom Dispatch</option>
                  <option value="dealer">Dealer Dispatch</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>{dispatchTargetKind === "showroom" ? "Showroom" : "Dealer"}</Label>
                <select
                  value={dispatchTargetCode}
                  onChange={(event) => setDispatchTargetCode(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">Select target</option>
                  {dispatchTargets.map((target) => {
                    const code =
                      dispatchTargetKind === "showroom"
                        ? (target as ShowroomTarget).showroom_code
                        : (target as DealerTarget).dealer_code;
                    const label =
                      dispatchTargetKind === "showroom"
                        ? `${code} - ${(target as ShowroomTarget).city || "Showroom"}`
                        : `${code} - ${(target as DealerTarget).business_name || "Dealer"}`;
                    return (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Inventory Type</Label>
                <select
                  value={dispatchItemType}
                  onChange={(event) => setDispatchItemType(event.target.value as DispatchItemType)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                >
                  <option value="Bike">Vehicles</option>
                  <option value="Spare">Spares</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  onClick={() => void handleDirectDispatch()}
                  disabled={dispatching || dispatchLoading || selectedItems.length === 0 || !dispatchTargetCode}
                >
                  {dispatching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Dispatch & Generate Docs
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Available {dispatchItemType === "Bike" ? "Vehicles" : "Spares"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selected {selectedItems.length} item(s), total Rs {selectedDispatchValue.toLocaleString()}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedItems([])} disabled={selectedItems.length === 0}>
                  Clear selection
                </Button>
              </div>

              {dispatchLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading available stock...</p>
              ) : dispatchItems.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No available {dispatchItemType === "Bike" ? "vehicles" : "spares"} found.
                </p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {dispatchItemType === "Bike"
                    ? (dispatchItems as AvailableBike[]).map((bike) => (
                        <label
                          key={bike.engine_number}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-slate-800/60"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedItems.includes(bike.engine_number)}
                            onChange={() => toggleSelectedItem(bike.engine_number)}
                          />
                          <span className="flex-1">
                            <span className="block font-medium text-slate-900 dark:text-white">
                              {bike.model_name || bike.model_code} - {bike.engine_number}
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              Chassis: {bike.chassis_number} - Color: {bike.color || "-"} - Rs {toNumber(bike.price).toLocaleString()}
                            </span>
                          </span>
                        </label>
                      ))
                    : (dispatchItems as AvailableSpare[]).map((spare) => (
                        <label
                          key={spare.serial_number}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-slate-800/60"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedItems.includes(spare.serial_number)}
                            onChange={() => toggleSelectedItem(spare.serial_number)}
                          />
                          <span className="flex-1">
                            <span className="block font-medium text-slate-900 dark:text-white">
                              {spare.spare_name || spare.spare_code} - {spare.serial_number}
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              Model: {spare.model_code} - Code: {spare.spare_code} - Rs {toNumber(spare.price).toLocaleString()}
                            </span>
                          </span>
                        </label>
                      ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
                          Target: {request.targetCode} - {request.itemsCount} item(s) - Rs {request.totalValue.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Requested: {new Date(request.requestedAt).toLocaleString()} - Expires: {new Date(request.expiresAt).toLocaleString()}
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
            <p className="flex items-center gap-2"><FileText className="h-4 w-4" /> Direct dispatch generates quotation, invoice, receipt, and delivery note PDFs.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
