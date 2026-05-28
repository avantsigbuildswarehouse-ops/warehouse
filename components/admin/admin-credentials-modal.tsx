"use client";

import { Loader2, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdminCredentialsModalProps = {
  title: string;
  description: string;
  confirmLabel: string;
  adminEmail: string;
  adminPassword: string;
  error: string | null;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function AdminCredentialsModal({
  title,
  description,
  confirmLabel,
  adminEmail,
  adminPassword,
  error,
  loading,
  onEmailChange,
  onPasswordChange,
  onClose,
  onConfirm,
}: AdminCredentialsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold dark:text-white">{title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-slate-700 dark:text-slate-300">
              Admin Email
            </Label>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={adminEmail}
              onChange={(event) => onEmailChange(event.target.value)}
              className="dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-700 dark:text-slate-300">
              Admin Password
            </Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={adminPassword}
              onChange={(event) => onPasswordChange(event.target.value)}
              className="dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
              onKeyDown={(event) => {
                if (event.key === "Enter") onConfirm();
              }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 dark:border-white/10 dark:text-white dark:hover:bg-slate-800"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={onConfirm}
              disabled={loading || !adminEmail || !adminPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {confirmLabel}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
