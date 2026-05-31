"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bike,
  Building,
  Building2,
  CircleDollarSign,
  Download,
  Filter,
  Loader2,
  Search,
  TrendingUp,
  Wrench,
  ChevronDown,
  X,
} from "lucide-react";

import { AdminCredentialsModal } from "@/components/admin/admin-credentials-modal";
import AppLoading from "@/components/feedback/app-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PaginationControls from "@/components/ui/pagination-controls";
import { createClient } from "@/lib/supabase/client";
import { generateSalesReportPdf } from "@/lib/utils/admin/sales-report-pdf";

const RECENT_PAGE_SIZE = 20;
const REPORTS_ACCESS_KEY = "warehouse_admin_reports_access";

type AppliedFilters = {
  startDate: string;
  endDate: string;
  category: string;
  type: string;
};

const defaultFilters: AppliedFilters = {
  startDate: "",
  endDate: "",
  category: "all",
  type: "all",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type SalesData = {
  summary: {
    totalVehiclesSold: number;
    totalSparesSold: number;
    totalVehicleValue: number;
    totalSpareValue: number;
    totalValue: number;
    showroomValue: number;
    dealerValue: number;
    showroomVehicles: number;
    showroomSpares: number;
    dealerVehicles: number;
    dealerSpares: number;
  };
  monthlyBreakdown: Array<{ month: string; vehicles: number; spares: number; total: number }>;
  topPartners: Array<{
    partnerId: string;
    partnerName: string | null;
    partnerType: string;
    vehicleCount: number;
    spareCount: number;
    totalValue: number;
  }>;
  recentSales: Array<{
    type: string;
    model_code: string;
    price: number;
    issued_at: string;
    issued_to: string;
    engine_number?: string;
    chassis_number?: string;
    spare_code?: string;
    serial_number?: string;
  }>;
};

type PartnerReport = {
  partner: {
    type: "dealer" | "showroom";
    code: string;
    name: string;
    city: string | null;
    isActive: boolean;
  };
  inventory: {
    bikeUnits: number;
    spareUnits: number;
    bikeValue: number;
    spareValue: number;
    totalInventoryValue: number;
  };
  retailSales: {
    bikesSold: number;
    sparesSold: number;
    bikeSalesValue: number;
    spareSalesValue: number;
    totalRetailValue: number;
  };
  warehouseIssuance: {
    vehicles: number;
    spares: number;
    totalValue: number;
  };
};

async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export default function SalesAnalyticsPage() {
  const [credentialsVerified, setCredentialsVerified] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  const [verifyingCredentials, setVerifyingCredentials] = useState(false);

  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const [draftFilters, setDraftFilters] = useState<AppliedFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(true);
  const [recentPage, setRecentPage] = useState(1);

  const [partnerQuery, setPartnerQuery] = useState("");
  const [partnerReport, setPartnerReport] = useState<PartnerReport | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerError, setPartnerError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(REPORTS_ACCESS_KEY) === "1") {
      setCredentialsVerified(true);
      setShowCredentialsModal(false);
    }
  }, []);

  const fetchSalesData = useCallback(async () => {
    if (!credentialsVerified) return;

    const isFirstLoad = !hasLoadedOnceRef.current;
    if (isFirstLoad) setInitialLoading(true);
    else setRefreshing(true);
    setFetchError(null);

    try {
      const params = new URLSearchParams();
      if (appliedFilters.startDate) params.append("startDate", appliedFilters.startDate);
      if (appliedFilters.endDate) params.append("endDate", appliedFilters.endDate);
      if (appliedFilters.category !== "all") params.append("category", appliedFilters.category);
      if (appliedFilters.type !== "all") params.append("type", appliedFilters.type);
      params.append("limit", "200");

      const res = await fetch(`/api/admin/reports?${params.toString()}`, {
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load reports");
      setSalesData(data);
      setRecentPage(1);
      hasLoadedOnceRef.current = true;
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Failed to fetch sales data");
      if (isFirstLoad) setSalesData(null);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [credentialsVerified, appliedFilters]);

  useEffect(() => {
    if (!credentialsVerified) return;
    void fetchSalesData();
  }, [credentialsVerified, appliedFilters, fetchSalesData]);

  async function handleVerifyCredentials() {
    setVerifyingCredentials(true);
    setCredentialsError(null);
    try {
      const res = await fetch("/api/profiles/verify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCredentialsError(data.error || "Invalid admin credentials");
        return;
      }
      sessionStorage.setItem(REPORTS_ACCESS_KEY, "1");
      setCredentialsVerified(true);
      setShowCredentialsModal(false);
      setAdminPassword("");
    } catch {
      setCredentialsError("Could not verify credentials. Try again.");
    } finally {
      setVerifyingCredentials(false);
    }
  }

  function applyFilters() {
    setAppliedFilters({ ...draftFilters });
  }

  function handleLockReports() {
    sessionStorage.removeItem(REPORTS_ACCESS_KEY);
    setCredentialsVerified(false);
    setShowCredentialsModal(true);
    setSalesData(null);
    hasLoadedOnceRef.current = false;
    setAdminPassword("");
  }

  async function searchPartner() {
    const q = partnerQuery.trim();
    if (!q) return;

    setPartnerLoading(true);
    setPartnerError(null);
    try {
      const params = new URLSearchParams({ query: q });
      if (appliedFilters.startDate) params.append("startDate", appliedFilters.startDate);
      if (appliedFilters.endDate) params.append("endDate", appliedFilters.endDate);

      const res = await fetch(`/api/admin/reports/partner?${params.toString()}`, {
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Partner not found");
      setPartnerReport(data);
    } catch (error) {
      setPartnerReport(null);
      setPartnerError(error instanceof Error ? error.message : "Search failed");
    } finally {
      setPartnerLoading(false);
    }
  }

  function handleResetFilters() {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  }

  const filtersDirty =
    draftFilters.startDate !== appliedFilters.startDate ||
    draftFilters.endDate !== appliedFilters.endDate ||
    draftFilters.category !== appliedFilters.category ||
    draftFilters.type !== appliedFilters.type;

  const paginatedRecentSales = useMemo(() => {
    if (!salesData) return [];
    const start = (recentPage - 1) * RECENT_PAGE_SIZE;
    return salesData.recentSales.slice(start, start + RECENT_PAGE_SIZE);
  }, [salesData, recentPage]);

  const recentTotalPages = salesData
    ? Math.max(1, Math.ceil(salesData.recentSales.length / RECENT_PAGE_SIZE))
    : 1;

  async function downloadPartnerReport() {
    if (!salesData || !partnerReport) return;
    setDownloadingPdf(true);
    try {
      await generateSalesReportPdf({
        generatedAt: new Date().toISOString(),
        filters: {
          startDate: appliedFilters.startDate || undefined,
          endDate: appliedFilters.endDate || undefined,
          partnerQuery: partnerReport.partner.name,
        },
        summary: {
          totalVehiclesSold: partnerReport.warehouseIssuance.vehicles,
          totalSparesSold: partnerReport.warehouseIssuance.spares,
          totalValue: partnerReport.warehouseIssuance.totalValue,
          showroomValue: partnerReport.partner.type === "showroom" ? partnerReport.warehouseIssuance.totalValue : 0,
          dealerValue: partnerReport.partner.type === "dealer" ? partnerReport.warehouseIssuance.totalValue : 0,
        },
        monthlyBreakdown: [],
        topPartners: [
          {
            partnerId: partnerReport.partner.code,
            partnerName: partnerReport.partner.name,
            partnerType: partnerReport.partner.type,
            vehicleCount: partnerReport.warehouseIssuance.vehicles,
            spareCount: partnerReport.warehouseIssuance.spares,
            totalValue: partnerReport.warehouseIssuance.totalValue,
          },
        ],
        recentSales: [],
        partnerDetail: {
          code: partnerReport.partner.code,
          name: partnerReport.partner.name,
          type: partnerReport.partner.type,
          inventory: {
            bikeUnits: partnerReport.inventory.bikeUnits,
            spareUnits: partnerReport.inventory.spareUnits,
            bikeValue: partnerReport.inventory.bikeValue,
            spareValue: partnerReport.inventory.spareValue,
          },
          retailSales: {
            bikesSold: partnerReport.retailSales.bikesSold,
            sparesSold: partnerReport.retailSales.sparesSold,
            bikeSalesValue: partnerReport.retailSales.bikeSalesValue,
            spareSalesValue: partnerReport.retailSales.spareSalesValue,
          },
          warehouseIssuance: partnerReport.warehouseIssuance,
        },
      });
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function downloadReport() {
    if (!salesData) return;
    setDownloadingPdf(true);
    try {
      await generateSalesReportPdf({
        generatedAt: new Date().toISOString(),
        filters: {
          startDate: appliedFilters.startDate || undefined,
          endDate: appliedFilters.endDate || undefined,
          category: appliedFilters.category,
          type: appliedFilters.type,
          partnerQuery: partnerReport?.partner.name || partnerQuery || undefined,
        },
        summary: {
          totalVehiclesSold: salesData.summary.totalVehiclesSold,
          totalSparesSold: salesData.summary.totalSparesSold,
          totalValue: salesData.summary.totalValue,
          showroomValue: salesData.summary.showroomValue,
          dealerValue: salesData.summary.dealerValue,
        },
        monthlyBreakdown: salesData.monthlyBreakdown,
        topPartners: salesData.topPartners.map((p) => ({
          partnerId: p.partnerId,
          partnerType: p.partnerType,
          partnerName: p.partnerName || undefined,
          vehicleCount: p.vehicleCount,
          spareCount: p.spareCount,
          totalValue: p.totalValue,
        })),
        recentSales: salesData.recentSales,
        partnerDetail: partnerReport
          ? {
              code: partnerReport.partner.code,
              name: partnerReport.partner.name,
              type: partnerReport.partner.type,
              inventory: {
                bikeUnits: partnerReport.inventory.bikeUnits,
                spareUnits: partnerReport.inventory.spareUnits,
                bikeValue: partnerReport.inventory.bikeValue,
                spareValue: partnerReport.inventory.spareValue,
              },
              retailSales: {
                bikesSold: partnerReport.retailSales.bikesSold,
                sparesSold: partnerReport.retailSales.sparesSold,
                bikeSalesValue: partnerReport.retailSales.bikeSalesValue,
                spareSalesValue: partnerReport.retailSales.spareSalesValue,
              },
              warehouseIssuance: partnerReport.warehouseIssuance,
            }
          : undefined,
      });
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (showCredentialsModal || !credentialsVerified) {
    return (
      <>
        <div className="min-h-full bg-slate-50 dark:bg-[#080B14]" />
        <AdminCredentialsModal
          title="Verify admin access"
          description="Sales reports are restricted. Re-enter your admin credentials to view issuance and partner performance data."
          confirmLabel="View reports"
          adminEmail={adminEmail}
          adminPassword={adminPassword}
          error={credentialsError}
          loading={verifyingCredentials}
          onEmailChange={setAdminEmail}
          onPasswordChange={setAdminPassword}
          onClose={() => {
            window.history.back();
          }}
          onConfirm={() => void handleVerifyCredentials()}
        />
      </>
    );
  }

  if (initialLoading && !salesData) {
    return <AppLoading />;
  }

  if (!salesData && !initialLoading) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-[#080B14]">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">{fetchError || "Failed to load sales data"}</p>
              <Button onClick={() => void fetchSalesData()} className="mt-4">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!salesData) {
    return <AppLoading />;
  }

  const totalUnits = salesData.summary.totalVehiclesSold + salesData.summary.totalSparesSold;

  return (
    <div className="relative min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      {refreshing && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center bg-slate-900/10 pt-24 dark:bg-black/20">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-lg dark:border-white/10 dark:bg-slate-900">
            <Loader2 className="size-4 animate-spin text-sky-600" />
            Updating report...
          </div>
        </div>
      )}
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900/60">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-500/10" />
          <Badge
            variant="outline"
            className="mb-6 w-fit border-slate-200 bg-slate-50 text-slate-700 backdrop-blur dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            Sales Analytics
          </Badge>
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
              Sales Performance Dashboard
            </h1>
            <p className="max-w-3xl text-base text-slate-700 dark:text-slate-400">
              Warehouse issuance to partners, retail sales at dealers/showrooms, and per-partner drill-down.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLockReports} className="shrink-0">
            Lock reports
          </Button>
          </div>
        </div>

        <Card className="dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="dark:text-white">Filter Sales Data</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  Adjust filters, then apply — the dashboard will not reload on every change
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="mr-2 size-4" />
                Filters
                <ChevronDown className={`ml-2 size-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Start Date</Label>
                  <Input
                    type="date"
                    value={draftFilters.startDate}
                    onChange={(e) =>
                      setDraftFilters((current) => ({ ...current, startDate: e.target.value }))
                    }
                    className="dark:border-white/10 dark:bg-slate-950/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">End Date</Label>
                  <Input
                    type="date"
                    value={draftFilters.endDate}
                    onChange={(e) =>
                      setDraftFilters((current) => ({ ...current, endDate: e.target.value }))
                    }
                    className="dark:border-white/10 dark:bg-slate-950/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Category</Label>
                  <select
                    value={draftFilters.category}
                    onChange={(e) =>
                      setDraftFilters((current) => ({ ...current, category: e.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                  >
                    <option value="all">All</option>
                    <option value="showroom">Showrooms Only</option>
                    <option value="dealer">Dealers Only</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">Type</Label>
                  <select
                    value={draftFilters.type}
                    onChange={(e) =>
                      setDraftFilters((current) => ({ ...current, type: e.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                  >
                    <option value="all">All Sales</option>
                    <option value="vehicles">Vehicles Only</option>
                    <option value="spares">Spares Only</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={handleResetFilters}>
                  <X className="mr-2 size-4" />
                  Reset
                </Button>
                <Button onClick={applyFilters} disabled={!filtersDirty || refreshing}>
                  Apply filters
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Search className="h-5 w-5" />
              Dealer / Showroom Lookup
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              Search by dealer code or business name, or showroom code or city
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="e.g. ASB-DL-001, dealer name, or showroom city..."
                value={partnerQuery}
                onChange={(e) => setPartnerQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void searchPartner()}
                className="dark:border-white/10 dark:bg-slate-950/60"
              />
              <Button onClick={() => void searchPartner()} disabled={partnerLoading || !partnerQuery.trim()}>
                {partnerLoading ? "Searching..." : "Search"}
              </Button>
            </div>
            {partnerError && <p className="text-sm text-red-600 dark:text-red-400">{partnerError}</p>}
            {partnerReport && (
              <div className="grid gap-4 md:grid-cols-3">
                <PartnerStatCard
                  title="On-hand inventory"
                  lines={[
                    `${partnerReport.inventory.bikeUnits} bikes (${formatCurrency(partnerReport.inventory.bikeValue)})`,
                    `${partnerReport.inventory.spareUnits} spares (${formatCurrency(partnerReport.inventory.spareValue)})`,
                    `Total: ${formatCurrency(partnerReport.inventory.totalInventoryValue)}`,
                  ]}
                />
                <PartnerStatCard
                  title="Retail sales (end customer)"
                  lines={[
                    `${partnerReport.retailSales.bikesSold} bikes sold`,
                    `${partnerReport.retailSales.sparesSold} spares sold`,
                    `Revenue: ${formatCurrency(partnerReport.retailSales.totalRetailValue)}`,
                  ]}
                />
                <PartnerStatCard
                  title="Warehouse issuance"
                  lines={[
                    `${partnerReport.warehouseIssuance.vehicles} vehicles`,
                    `${partnerReport.warehouseIssuance.spares} spares`,
                    `Value: ${formatCurrency(partnerReport.warehouseIssuance.totalValue)}`,
                  ]}
                />
                <div className="md:col-span-3 flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {partnerReport.partner.name}{" "}
                      <span className="text-slate-500">({partnerReport.partner.code})</span>
                    </p>
                    <p className="text-sm text-slate-500">
                      {partnerReport.partner.type === "showroom" ? "Showroom" : "Dealer"}
                      {partnerReport.partner.city ? ` • ${partnerReport.partner.city}` : ""}
                      {!partnerReport.partner.isActive ? " • Inactive" : ""}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={downloadingPdf}
                    onClick={() => void downloadPartnerReport()}
                  >
                    <Download className="mr-2 size-4" />
                    {downloadingPdf ? "Generating..." : "Download Partner PDF"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Vehicles Issued" value={formatNumber(salesData.summary.totalVehiclesSold)} icon={Bike} />
          <MetricCard label="Spares Issued" value={formatNumber(salesData.summary.totalSparesSold)} icon={Wrench} />
          <MetricCard label="Total Issuance Value" value={formatCurrency(salesData.summary.totalValue)} icon={CircleDollarSign} />
          <MetricCard
            label="Average per Unit"
            value={formatCurrency(totalUnits ? salesData.summary.totalValue / totalUnits : 0)}
            icon={TrendingUp}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <CategoryCard
            title="Showroom Issuance"
            icon={Building}
            value={formatCurrency(salesData.summary.showroomValue)}
            vehicles={salesData.summary.showroomVehicles}
            spares={salesData.summary.showroomSpares}
            tone="sky"
          />
          <CategoryCard
            title="Dealer Issuance"
            icon={Building2}
            value={formatCurrency(salesData.summary.dealerValue)}
            vehicles={salesData.summary.dealerVehicles}
            spares={salesData.summary.dealerSpares}
            tone="purple"
          />
        </div>

        <Card className="dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="dark:text-white">Monthly Breakdown</CardTitle>
              <CardDescription className="dark:text-slate-400">Issuance value by month</CardDescription>
            </div>
            <Button onClick={() => void downloadReport()} variant="outline" disabled={downloadingPdf}>
              <Download className="mr-2 size-4" />
              {downloadingPdf ? "Generating PDF..." : "Download PDF Report"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="p-3 text-left font-semibold">Month</th>
                    <th className="p-3 text-right font-semibold">Vehicles</th>
                    <th className="p-3 text-right font-semibold">Spares</th>
                    <th className="p-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.monthlyBreakdown.map((month) => (
                    <tr key={month.month} className="border-t dark:border-white/10">
                      <td className="p-3 font-medium">{month.month}</td>
                      <td className="p-3 text-right">{formatCurrency(month.vehicles)}</td>
                      <td className="p-3 text-right">{formatCurrency(month.spares)}</td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(month.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="dark:text-white">Top Partners</CardTitle>
            <CardDescription className="dark:text-slate-400">By warehouse issuance value</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {salesData.topPartners.map((partner, index) => (
              <div
                key={partner.partnerId}
                className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 dark:border-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {partner.partnerName || partner.partnerId}
                    </p>
                    <p className="text-xs text-slate-500">
                      {partner.partnerId} • {partner.partnerType === "showroom" ? "Showroom" : "Dealer"} •{" "}
                      {partner.vehicleCount} vehicles • {partner.spareCount} spares
                    </p>
                  </div>
                </div>
                <p className="font-semibold">{formatCurrency(partner.totalValue)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="dark:text-white">Recent Issuance</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Showing {paginatedRecentSales.length} of {salesData.recentSales.length} records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="p-3 text-left font-semibold">Type</th>
                    <th className="p-3 text-left font-semibold">Item</th>
                    <th className="p-3 text-right font-semibold">Price</th>
                    <th className="p-3 text-left font-semibold">Issued To</th>
                    <th className="p-3 text-left font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecentSales.map((sale, index) => (
                    <tr key={`${sale.issued_at}-${index}`} className="border-t dark:border-white/10">
                      <td className="p-3">
                        <Badge variant={sale.type === "vehicle" ? "default" : "secondary"}>
                          {sale.type === "vehicle" ? "Vehicle" : "Spare"}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium">
                        {sale.type === "vehicle"
                          ? `${sale.engine_number || sale.model_code}${sale.chassis_number ? ` / ${sale.chassis_number}` : ""}`
                          : sale.spare_code || sale.model_code}
                      </td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(sale.price)}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{sale.issued_to}</td>
                      <td className="p-3 text-slate-500">{formatDate(sale.issued_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recentTotalPages > 1 && (
              <PaginationControls
                currentPage={recentPage}
                totalPages={recentTotalPages}
                onPageChange={setRecentPage}
                totalItemsLabel={`${salesData.recentSales.length} records`}
              />
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
    <Card className="border-slate-200/60 bg-white/90 shadow-sm dark:border-white/5 dark:bg-slate-900/60">
      <CardHeader className="p-6">
        <CardDescription className="font-semibold text-slate-500">{label}</CardDescription>
        <CardTitle className="mt-2 flex items-center gap-3 text-2xl font-bold">
          <div className="rounded-xl bg-emerald-100 p-2.5 dark:bg-emerald-500/20">
            <Icon className="size-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function CategoryCard({
  title,
  icon: Icon,
  value,
  vehicles,
  spares,
  tone,
}: {
  title: string;
  icon: typeof Building;
  value: string;
  vehicles: number;
  spares: number;
  tone: "sky" | "purple";
}) {
  const border =
    tone === "sky"
      ? "border-sky-200/60 bg-gradient-to-br from-white to-sky-50/50 dark:from-slate-900/60 dark:to-sky-950/20"
      : "border-purple-200/60 bg-gradient-to-br from-white to-purple-50/50 dark:from-slate-900/60 dark:to-purple-950/20";

  return (
    <Card className={border}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Total Value</span>
            <span className="text-2xl font-bold">{value}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t pt-4 dark:border-white/10">
            <div>
              <p className="text-sm text-slate-500">Vehicles</p>
              <p className="text-xl font-semibold">{formatNumber(vehicles)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Spares</p>
              <p className="text-xl font-semibold">{formatNumber(spares)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PartnerStatCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
      <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
