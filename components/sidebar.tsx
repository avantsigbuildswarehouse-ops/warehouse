"use client";

import Link from "next/link";
import LogoutButton from "./logout-button";
import { LayoutDashboard, Shield, Users, DoorOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Props = {
  role: string | null;
};

export default function Sidebar({ role }: Props) {
  if (!role) return null;

  const linkClass =
    "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition hover:bg-gray-100";

  return (
    <div className="w-72 h-screen bg-gradient-to-b from-white to-gray-50 border-r flex flex-col justify-between p-4">

      {/* TOP */}
      <div className="flex flex-col gap-6">

        {/* HEADER */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight">
            Admin Panel
          </h1>

          <Badge className="w-fit bg-black text-white hover:bg-black">
            {role.toUpperCase()}
          </Badge>
        </div>

        <Separator />

        {/* NAV */}
        <nav className="flex flex-col gap-2">

          <Link href="/dashboard" className={linkClass}>
            <LayoutDashboard size={18} />
            Dashboard
          </Link>

          {role === "admin" && (
            <>
              <Link href="/admin" className={linkClass}>
                <Shield size={18} />
                Admin Panel
              </Link>

              <Link href="/manager" className={linkClass}>
                <Users size={18} />
                Manager
              </Link>

              <Link href="/frontdesk" className={linkClass}>
                <DoorOpen size={18} />
                Front Desk
              </Link>
            </>
          )}

          {role === "manager" && (
            <>
              <Link href="/manager" className={linkClass}>
                <Users size={18} />
                Manager
              </Link>

              <Link href="/frontdesk" className={linkClass}>
                <DoorOpen size={18} />
                Front Desk
              </Link>
            </>
          )}

          {role === "frontdesk" && (
            <Link href="/frontdesk" className={linkClass}>
              <DoorOpen size={18} />
              Front Desk
            </Link>
          )}
        </nav>
      </div>

      {/* BOTTOM */}
      <div className="pt-4 border-t">
        <LogoutButton />
      </div>
    </div>
  );
}
