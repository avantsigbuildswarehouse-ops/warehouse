import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PartnerAnalyticsDashboard from "@/components/analytics/partner-analytics-dashboard";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/require-role";
import { getPartnerAnalytics, type PartnerAnalyticsData } from "@/lib/analytics";

export default async function ShowroomAnalyticsPage(
  props: PageProps<"/showroom/[showroomCode]/Analytics">
) {
  await requireRole(["showroom-admin"]);

  const { showroomCode } = await props.params;

  let analytics: PartnerAnalyticsData | null = null;
  let error: string | null = null;

  try {
    analytics = await getPartnerAnalytics("showroom", showroomCode);
  } catch (caughtError) {
    error =
      caughtError instanceof Error
        ? caughtError.message
        : "Failed to load showroom analytics";
  }

  if (error) {
    return (
      <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <Button asChild variant="outline">
            <Link href={`/showroom/${showroomCode}`}>
              <ArrowLeft className="mr-2 size-4" />
              Back to showroom home
            </Link>
          </Button>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/20 dark:bg-red-900/10">
            <p className="text-sm text-red-700 dark:text-red-400">
              Error: {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return <PartnerAnalyticsDashboard analytics={analytics} />;
}
