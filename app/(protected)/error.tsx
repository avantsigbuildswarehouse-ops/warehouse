"use client";

import AppError from "@/components/feedback/app-error";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <AppError error={error} reset={reset} />;
}
