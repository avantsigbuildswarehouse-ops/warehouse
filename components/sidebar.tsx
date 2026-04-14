"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  Archive,
  DoorOpen,
  LayoutDashboard,
  Shield,
  Users,
} from "lucide-react";

import LogoutButton from "./logout-button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Props = {
  role: string | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
};

function getNavItems(role: string): NavItem[] {
  if (role === "admin") {
    return [
      { href: "/admin", label: "Admin Home", icon: Shield, exact: true },
      { href: "/admin/Inventory", label: "Vehicle Inventory", icon: Archive },
      { href: "/admin/Spares", label: "Spare Inventory", icon: Users },
      { href: "/frontdesk", label: "Front Desk", icon: DoorOpen },
    ];
  }

  if (role === "manager") {
    return [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/manager", label: "Manager", icon: Users },
      { href: "/frontdesk", label: "Front Desk", icon: DoorOpen },
    ];
  }

  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/frontdesk", label: "Front Desk", icon: DoorOpen },
  ];
}

export default function Sidebar({ role }: Props) {
  const pathname = usePathname();

  if (!role) return null;

  const navItems = getNavItems(role);

  return (
    <div className="sticky top-0 flex h-screen w-72 flex-col justify-between border-r border-slate-200 bg-[linear-gradient(180deg,#fcfdff_0%,#eef6ff_55%,#f4fbf8_100%)] p-4">
      <div className="flex flex-col gap-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-[linear-gradient(160deg,rgba(59,130,246,0.16),rgba(45,212,191,0.14),rgba(255,255,255,0.94))] p-4 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.75),transparent_70%)]" />
          <div className="relative flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-950">
              Warehouse Hub
            </h1>
            <p className="text-sm text-slate-600">
              {role === "admin"
                ? "Catalog, stock, and intake control"
                : "Workspace navigation"}
            </p>

            <Badge className="mt-2 w-fit bg-slate-950 text-white hover:bg-slate-950">
              {role.toUpperCase()}
            </Badge>
          </div>
        </div>

        <Separator />

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "border-sky-400/50 bg-[linear-gradient(135deg,#2563eb,#0f172a)] text-white shadow-[0_10px_30px_rgba(37,99,235,0.25)]"
                    : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-white/80"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 shadow-sm backdrop-blur">
        <LogoutButton />
      </div>
    </div>
  );
}
