"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw, Plus } from "lucide-react";
import Link from "next/link";

import {
  asbShowroomSchema,
  type ASBShowroomFormValues,
} from "@/lib/validations/showroom/asb-showroom.schema";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Showroom = {
  showroom_code: string;
  city: string;
  state: string;
  address: string;
  is_active: boolean;
  created_at: string;
};

function generateLocalCode(last?: string) {
  if (!last) return "ASB-SH-001";

  const match = last.match(/ASB-SH-(\d+)/);
  const num = match ? parseInt(match[1], 10) + 1 : 1;

  return `ASB-SH-${String(num).padStart(3, "0")}`;
}

export default function ShowroomPage() {
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ASBShowroomFormValues>({
    resolver: zodResolver(asbShowroomSchema),
    defaultValues: {
      city: "",
      state: "",
      address: "",
      is_active: true,
    },
  });

  async function loadShowrooms() {
    setLoading(true);

    try {
      const res = await fetch("/api/showrooms");

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      setShowrooms(data);
    } catch (err) {
      setStatus("Failed to load showrooms");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadShowrooms();
  }, []);

  async function onSubmit(data: ASBShowroomFormValues) {
    setSubmitting(true);
    setStatus(null);

    try {
      const last = showrooms[0]?.showroom_code;
      const code = generateLocalCode(last);

      const res = await fetch("/api/showrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showroom_code: code,
          city: data.city.trim(),
          state: data.state.trim(),
          address: data.address.trim(),
          is_active: data.is_active,
        }),
      });

      if (!res.ok) throw new Error("Insert failed");

      setStatus(`Showroom ${code} created`);
      reset();
      await loadShowrooms();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  const stats = useMemo(() => {
    return {
      total: showrooms.length,
      active: showrooms.filter((s) => s.is_active).length,
      inactive: showrooms.filter((s) => !s.is_active).length,
    };
  }, [showrooms]);

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900/60">
          <Badge variant="outline" className="w-fit border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 text-slate-700 bg-slate-50">
            Admin showroom control
          </Badge>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Showrooms</h1>
              <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-400">Manage locations</p>
            </div>

            <Button variant="outline" onClick={loadShowrooms} disabled={loading}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Showrooms</p>
              <p className="mt-2 text-3xl font-bold dark:text-white">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active</p>
              <p className="mt-2 text-3xl font-bold dark:text-white">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Inactive</p>
              <p className="mt-2 text-3xl font-bold dark:text-white">{stats.inactive}</p>
            </CardContent>
          </Card>
        </div>

        {/* FORM */}
        <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="dark:text-white">Create Showroom</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <Label className="dark:text-slate-300">City</Label>
                  <Input
                    placeholder="Colombo"
                    {...register("city")}
                    className="h-11 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                  />
                  {errors.city && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.city.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="dark:text-slate-300">State</Label>
                  <Input
                    placeholder="Western Province"
                    {...register("state")}
                    className="h-11 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                  />
                  {errors.state && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.state.message}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label className="dark:text-slate-300">Address</Label>
                  <Input
                    placeholder="No 25, Galle Road, Colombo 03"
                    {...register("address")}
                    className="h-11 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                  />
                  {errors.address && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.address.message}
                    </p>
                  )}
                </div>

              </div>

              <Button disabled={submitting}>
                <Plus className="size-4" />
                {submitting ? "Saving..." : "Create Showroom"}
              </Button>

              {status && (
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {status}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* LIST */}
        <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="dark:text-white">List</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {showrooms.length === 0 ? (
              <p className="text-center text-slate-500 dark:text-slate-400">No showrooms found</p>
            ) : (
              showrooms.map((s) => (
                <div
                  key={s.showroom_code}
                  className="rounded-2xl border border-slate-200 p-4 transition-colors dark:border-white/10 dark:bg-slate-800/20"
                >
                  <p className="font-semibold text-slate-950 dark:text-white">
                    {s.city}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {s.state}
                  </p>
                  <p className="mt-1 text-xs font-mono text-slate-500 dark:text-slate-500">
                    {s.showroom_code}
                  </p>
                  <Link
                      href={`/admin/Showroom/${s.showroom_code}`}
                      className="mt-2 text-sky-600 dark:text-sky-400 text-sm hover:background-sky-100 dark:hover:bg-sky-500/10 rounded transition-colors"
                    >
                      View Stock
                  </Link>
                </div>
                
              ))
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
