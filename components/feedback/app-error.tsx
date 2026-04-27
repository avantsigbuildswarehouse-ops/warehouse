"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Card className="border-red-200 bg-white shadow-sm dark:border-red-900/30 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              An unexpected error occurred while loading this page.
            </p>
            <p className="rounded-md bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {error?.message || "Unknown error"}
            </p>
            <Button onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
