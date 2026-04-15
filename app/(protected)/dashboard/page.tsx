import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900/60">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-500/10" />
          <Badge
            variant="outline"
            className="mb-6 w-fit border-slate-200 bg-slate-50 text-slate-700 backdrop-blur dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300"
          >
            Dashboard
          </Badge>
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
                Overview
              </h1>
              <p className="max-w-xl text-base text-slate-700 dark:text-slate-400">
                Welcome to your workspace. Review the latest activities and access quick links below to manage your daily tasks.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button asChild className="rounded-xl shadow-md transition-all hover:-translate-y-0.5 dark:bg-sky-500 dark:text-white dark:hover:bg-sky-400">
                <Link href="/frontdesk">Go to Front Desk</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Empty State / Welcome Content */}
        <div className="rounded-3xl border border-slate-200 border-dashed bg-white/50 p-12 text-center transition-colors dark:border-white/10 dark:bg-slate-900/40">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Recent Activity</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            You are currently all caught up. Check back later for new tasks or reports requiring your attention.
          </p>
        </div>
      </div>
    </div>
  );
}
