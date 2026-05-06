import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import SalesDocumentsHistory from "@/components/History/sales-documents-history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/require-role";
import { getSalesHistoryData } from "@/lib/sales/history";

export default async function DealerCompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ dealerCode: string }>;
  searchParams?: Promise<{ stage?: string }>;
}) {
  await requireRole(["dealer-admin"]);

  const { dealerCode } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const stageFilter = resolvedSearchParams?.stage === "advance" ? "advance" : "all";
  const data = await getSalesHistoryData({
    buyerType: "company",
    targetType: "dealer",
    targetCode: dealerCode,
    stageFilter,
  });

  return (
    <div className="min-h-full bg-slate-50 dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8">
        <div className="rounded-3xl border border-sky-200/60 bg-white/80 p-8 backdrop-blur dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex justify-between">
            <div>
              <Badge className="mb-3 bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                {stageFilter === "advance" ? "Dealer Company Advance Payments" : "Dealer Company Sales"}
              </Badge>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">{dealerCode}</h1>
              <p className="text-slate-600 dark:text-slate-400">
                {stageFilter === "advance"
                  ? "Company advance-payment bookings with buyer details, Performer Invoices, and Pre-Order Quotations."
                  : "Company on-site sales and advance-payment records with buyer details and downloadable document copies."}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/dealer/${dealerCode}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        </div>

        <SalesDocumentsHistory
          data={data}
          title={stageFilter === "advance" ? "Company Advance Payments" : "Company Sales"}
          description={
            stageFilter === "advance"
              ? "Each entry represents a company advance-payment booking. Expand a record to view company details, requested vehicle model, payment breakdown, and use Get Copies to reopen the saved Performer Invoice and Pre-Order Quotation."
              : "Each entry represents either a completed company sale or an advance-payment booking. Expand a record to view company details, sold item or pre-order details, and use Get Copies to reopen saved PDFs."
          }
          buyerLabel="Company"
          groupsLabel={stageFilter === "advance" ? "Advance payment records" : undefined}
          vehiclesLabel={stageFilter === "advance" ? "Requested vehicles" : undefined}
          sparesLabel={stageFilter === "advance" ? "Spare requests" : undefined}
          emptyMessage={
            stageFilter === "advance" ? "No company advance-payment records found yet." : undefined
          }
        />
      </div>
    </div>
  );
}
