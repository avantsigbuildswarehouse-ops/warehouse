import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import SalesDocumentsHistory from "@/components/History/sales-documents-history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSalesHistoryData } from "@/lib/sales/history";
import { requireRole } from "@/lib/auth/require-role";

export default async function ShowroomCustomerPage({
  params,
}: {
  params: Promise<{ showroomCode: string }>;
}) {
  await requireRole(["showroom-admin"]);

  const { showroomCode } = await params;
  const data = await getSalesHistoryData({
    buyerType: "customer",
    targetType: "showroom",
    targetCode: showroomCode,
  });

  return (
    <div className="min-h-full bg-slate-50 dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8">
        <div className="rounded-3xl border border-sky-200/60 bg-white/80 p-8 backdrop-blur dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex justify-between">
            <div>
              <Badge className="mb-3 bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                Showroom Customer Sales
              </Badge>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">{showroomCode}</h1>
              <p className="text-slate-600 dark:text-slate-400">
                Completed customer sales with item details and downloadable documents.
              </p>
            </div>

            <Button asChild variant="outline">
              <Link href="/showroom">
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Link>
            </Button>
          </div>
        </div>

        <SalesDocumentsHistory
          data={data}
          title="Customer Sales"
          description="Each entry represents a completed customer sale. Expand a sale to see the sold bikes, chassis details, spares, and payment breakdown."
          buyerLabel="Customer"
        />
      </div>
    </div>
  );
}
