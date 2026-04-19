"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

import Image from "next/image";

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

    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;

    // Validate inputs
    if (!email || !password) {
      setLoading(false);
      setErrorMsg("Email and password are required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLoading(false);
      setErrorMsg("Invalid email format");
      return;
    }

    if (password.length < 6) {
      setLoading(false);
      setErrorMsg("Invalid credentials");
      return;
    }

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 transition-colors dark:bg-[#080B14]">
      {/* Background Orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.1),transparent_35rem),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.1),transparent_35rem)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_35rem),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.08),transparent_35rem)]" />
      <div className="absolute left-10 top-10 h-64 w-64 rounded-full bg-sky-200/50 blur-3xl dark:bg-sky-500/10" />
      <div className="absolute bottom-8 right-10 h-80 w-80 rounded-full bg-teal-200/50 blur-3xl dark:bg-teal-500/10" />

      {/* Main Container - Single Centered Card */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/80 bg-white/60 p-8 shadow-xl backdrop-blur-xl transition-colors dark:border-white/5 dark:bg-slate-900/40 dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] sm:p-12">
        <div className="flex flex-col items-center justify-center space-y-8">
          
          {/* Logo container strictly styled for sizing */}
          <div className="relative mb-2 flex justify-center">
            <Image 
              src="/avantbg.png" 
              alt="Avant Logo" 
              width={160} 
              height={45} 
              className="object-contain scale-200"
              priority
            />
          </div>

          <div className="w-full space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome back
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Enter your credentials to access your workspace.
            </p>
          </div>

          <form onSubmit={login} className="w-full space-y-6">
            <div className="space-y-4">
              <input
                name="email"
                type="email"
                placeholder="Email address"
                required
                className="h-12 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:bg-slate-900"
              />

              <input
                name="password"
                type="password"
                placeholder="Password"
                required
                className="h-12 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-400 dark:focus:bg-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-900 px-4 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-70 dark:bg-sky-500 dark:hover:bg-sky-400 dark:shadow-[0_0_20px_rgba(14,165,233,0.2)]"
            >
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
              <span className="relative z-10">{loading ? "Authenticating..." : "Sign In"}</span>
            </button>
          </form>

          {errorMsg ? (
            <div className="w-full animate-in fade-in slide-in-from-top-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm font-medium text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              {errorMsg}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
