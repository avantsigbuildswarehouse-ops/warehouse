"use client";

import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  return (
    <button
      onClick={logout}
      className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition"
    >
      <LogOut size={18} />
      Logout
    </button>
  );
}
