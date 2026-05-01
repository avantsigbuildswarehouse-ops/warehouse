"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  Archive,
  Building,
  Building2,
  DoorOpen,
  LayoutDashboard,
  PackageOpen,
  Shield,
  Users,
  History,
  Wrench,
  ArchiveRestore,
  ChartNoAxesCombined,
  ClipboardList,
} from "lucide-react";

import LogoutButton from "./logout-button";
import { ThemeToggle } from "./theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Props = {
  role: string | null;
  email: string | null;
  code: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
};

function getNavItems(role: string, code: string): NavItem[] {
  if (role === "admin") {
    return [
      { href: "/admin", label: "Admin Home", icon: Shield, exact: true },
      { href: "/admin/Analytics", label: "Analytics", icon: ChartNoAxesCombined },
      { href: "/admin/Profiles", label: "Profiles", icon: Users },
      { href: "/admin/Inventory", label: "Vehicle Inventory", icon: Archive },
      { href: "/admin/Spares", label: "Spare Inventory", icon: Wrench },
      { href: "/admin/Showroom", label: "Showrooms", icon: Building },
      { href: "/admin/Dealers", label: "Dealers", icon: Building2 },
      { href: "/admin/IssueStock", label: "Issue Inventory", icon: PackageOpen },
      { href: "/admin/IssuedHistory", label: "Issued History", icon: History },
    ];
  }

  if (role === "dealer-admin") {
    return [
      { href: `/dealer/${code}`, label: "Dealer Home", icon: Shield, exact: true },
      { href: `/dealer/${code}/Request`, label: "Request Inventory", icon: ArchiveRestore},
      { href: `/dealer/${code}/MyRequests`, label: "Request Status", icon: ClipboardList},
      { href: `/dealer/${code}/Customer`, label: "Customer Invoice", icon: Users },
      { href: `/dealer/${code}/Company`, label: "Company Invoice", icon: Building},
      { href: `/dealer/${code}/Analytics`, label: "Analytics", icon: ChartNoAxesCombined}
    ];
  }

    if (role === "showroom-admin") {
    return [
      { href: `/showroom/${code}`, label: "Showroom Home", icon: Shield, exact: true },
      { href: `/showroom/${code}/Request`, label: "Request Inventory", icon: ArchiveRestore},
      { href: `/showroom/${code}/MyRequests`, label: "Request Status", icon: ClipboardList},
      { href: `/showroom/${code}/Customer`, label: "Customer Invoice", icon: Users },
      { href: `/showroom/${code}/Company`, label: "Company Invoice", icon: Building},
      { href: `/showroom/${code}/Analytics`, label: "Analytics", icon: ChartNoAxesCombined}
    ];
  }

  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/frontdesk", label: "Front Desk", icon: DoorOpen },
  ];
}

export default function Sidebar({ role, email, code }: Props) {
  const pathname = usePathname();

  if (!role) return null;

  const navItems = getNavItems(role, code);

  return (
    <div className="sticky top-0 z-20 flex h-screen w-72 flex-col justify-between border-r border-slate-200 bg-slate-50 p-4 transition-colors dark:border-white/10 dark:bg-[#080B14]">
      <div className="flex min-h-0 flex-col gap-6">

        {/* Brand Area */}
        <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:shadow-none flex-shrink-0">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.8),transparent_70%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_70%)]" />
          <div className="relative flex flex-col items-start gap-4">
            <Image
              src="/avantbg.png"
              alt="Avant Logo"
              width={140}
              height={40}
              className="object-contain scale-150 drop-shadow-sm light:invert"
              priority
            />
            <div className="space-y-2 w-full">
              <Badge className="w-fit bg-slate-900 text-white hover:bg-slate-800 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30 dark:border-sky-500/30 border-transparent transition-colors">
                {role.toUpperCase()} WORKSPACE
              </Badge>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {role === "admin"
                  ? "Full inventory & access control"
                  : "Daily operations center"}
                  <br/>
                {email}  
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-200/60 dark:bg-slate-800 flex-shrink-0" />

        {/* Navigation */}
        <nav className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
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
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "bg-white text-sky-600 shadow-sm ring-1 ring-slate-200/50 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20 dark:shadow-none"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    "transition-transform duration-200 group-hover:scale-110 flex-shrink-0",
                    isActive
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-slate-400 dark:text-slate-500"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Area */}
      <div className="flex flex-col gap-2 flex-shrink-0 pt-4">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="flex-1 rounded-xl border border-slate-200/80 bg-white/70 p-1 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}