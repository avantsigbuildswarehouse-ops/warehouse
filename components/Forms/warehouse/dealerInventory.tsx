"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  asbDealerSchema,
  type ASBDealerFormValues,
} from "@/lib/validations/dealer/asb-dealer.schema";

import {
  getDealers,
  createDealer,
  generateDealerCode,
  type Dealer,
} from "@/lib/dealers/asb-dealer";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Status =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

export default function DealerPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ASBDealerFormValues>({
    resolver: zodResolver(asbDealerSchema),
    defaultValues: {
      business_name: "",
      owner_name: "",
      city: "",
      state: "",
      address: "",
      is_active: true,
    },
  });

  async function loadDealers() {
    setLoading(true);
    try {
      const data = await getDealers();
      setDealers(Array.isArray(data) ? data : []);
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load dealers",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDealers();
  }, []);

  async function onSubmit(data: ASBDealerFormValues) {
    setSubmitting(true);
    setStatus(null);

    try {
      const code = await generateDealerCode();

      await createDealer({
        dealer_code: code,
        business_name: data.business_name.trim(),
        owner_name: data.owner_name?.trim() || undefined,
        city: data.city.trim(),
        state: data.state.trim(),
        address: data.address.trim(),
        is_active: data.is_active,
      });

      setStatus({
        type: "success",
        message: `Dealer ${code} created successfully`,
      });

      reset();
      await loadDealers();
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to create dealer",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const stats = useMemo(() => {
    return {
      total: dealers.length,
      active: dealers.filter((d) => d.is_active).length,
      inactive: dealers.filter((d) => !d.is_active).length,
    };
  }, [dealers]);

  return (
    <div className="min-h-full bg-slate-50 transition-colors dark:bg-[#080B14]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900/60">
          <Badge variant="outline" className="w-fit border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 text-slate-700 bg-slate-50">
            Admin dealer control
          </Badge>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">ASB Dealers</h1>
              <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-400">Manage dealer network</p>
            </div>

            <Button variant="outline" onClick={loadDealers} disabled={loading}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Dealers</p>
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
            <CardTitle className="dark:text-white">Create Dealer</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <Label className="dark:text-slate-300">Business Name</Label>
                  <Input
                    placeholder="ABC Motors Pvt Ltd"
                    {...register("business_name")}
                    className="h-11 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                  />
                  {errors.business_name && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.business_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="dark:text-slate-300">Owner Name</Label>
                  <Input
                    placeholder="John Perera"
                    {...register("owner_name")}
                    className="h-11 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                  />
                </div>

                <div>
                  <Label className="dark:text-slate-300">City</Label>
                  <Input
                    placeholder="Colombo"
                    {...register("city")}
                    className="h-11 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                  />
                </div>

                <div>
                  <Label className="dark:text-slate-300">State</Label>
                  <Input
                    placeholder="Western Province"
                    {...register("state")}
                    className="h-11 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="dark:text-slate-300">Address</Label>
                  <Input
                    placeholder="No 25, Galle Road, Colombo 03"
                    {...register("address")}
                    className="h-11 rounded-xl border-slate-200 dark:border-white/10 dark:bg-slate-950/60 dark:text-white"
                  />
                </div>

              </div>

              <Button disabled={submitting}>
                <Plus className="size-4" />
                {submitting ? "Creating..." : "Create Dealer"}
              </Button>

              {status && (
                <p
                  className={`text-sm font-medium ${
                    status.type === "success"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {status.message}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* LIST */}
        <Card className="border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-slate-900/60">
          <CardHeader>
            <CardTitle className="dark:text-white">Dealer List</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {dealers.map((d) => (
              <div
                key={d.dealer_code}
                className="flex justify-between rounded-2xl border border-slate-200 p-4 transition-colors dark:border-white/10 dark:bg-slate-800/20"
              >
                <div>
                  <p className="font-semibold text-slate-950 dark:text-white">{d.business_name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {d.city} • {d.state}
                  </p>
                  <p className="mt-1 text-xs font-mono text-slate-500 dark:text-slate-500">{d.dealer_code}</p>
                  <Link
                    href={`/admin/Dealers/${d.dealer_code}`}
                    className="mt-2 text-sky-600 dark:text-sky-400 text-sm hover:background-sky-100 dark:hover:bg-sky-500/10 rounded transition-colors"
                  >
                    View Stock
                  </Link>
                </div>

                <Badge variant={d.is_active ? "default" : "secondary"}>
                  {d.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
