"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setErrorMsg(null);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setErrorMsg("Invalid credentials");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setLoading(false);
      setErrorMsg("Login failed");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setLoading(false);
      setErrorMsg("Role not found");
      return;
    }

    setLoading(false);

    if (profile.role === "admin") router.replace("/admin");
    else if (profile.role === "manager") router.replace("/manager");
    else if (profile.role === "frontdesk") router.replace("/frontdesk");
    else router.replace("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_26rem),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.18),transparent_24rem)]" />
      <div className="absolute left-10 top-10 h-28 w-28 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="absolute bottom-8 right-10 h-32 w-32 rounded-full bg-teal-300/20 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur xl:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden bg-[linear-gradient(145deg,#0f172a,#1d4ed8,#14b8a6)] p-10 text-white xl:flex xl:flex-col xl:justify-between">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">
              Warehouse Hub
            </p>
            <h1 className="max-w-md text-4xl font-semibold leading-tight">
              Smarter warehouse control for bikes, spares, and stock movement.
            </h1>
            <p className="max-w-md text-sm text-white/80">
              Admins can manage the full inventory view, while each role lands in
              the workspace built for their daily work.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-white/60">
                Centralized
              </p>
              <p className="mt-2 text-lg font-medium">Bike and spare intake</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-white/60">
                Role-aware
              </p>
              <p className="mt-2 text-lg font-medium">Admin-only catalog access</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-700">
                Sign in
              </p>
              <h2 className="text-3xl font-semibold text-slate-950">
                Access your workspace
              </h2>
              <p className="text-sm text-slate-600">
                Use your warehouse account to continue.
              </p>
            </div>

            <form onSubmit={login} className="space-y-4">
              <input
                name="email"
                type="email"
                placeholder="Email address"
                required
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-sky-400"
              />

              <input
                name="password"
                type="password"
                placeholder="Password"
                required
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-sky-400"
              />

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-[linear-gradient(135deg,#2563eb,#0f172a)] px-4 text-sm font-medium text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)] transition hover:opacity-95 disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            {errorMsg ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMsg}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
