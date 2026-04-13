"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

  const role = profile.role;

  setLoading(false);

  if (role === "admin") router.replace("/admin");
  else if (role === "manager") router.replace("/manager");
  else if (role === "frontdesk") router.replace("/frontdesk");
  else router.replace("/dashboard");
}


  return (
    <div className="flex flex-col gap-4 w-80">
      <form onSubmit={login} className="flex flex-col gap-2">
        <input
          name="email"
          type="email"
          placeholder="email"
          required
          className="border p-2"
        />

        <input
          name="password"
          type="password"
          placeholder="password"
          required
          className="border p-2"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white p-2"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {errorMsg && (
        <p className="text-red-500 text-sm">{errorMsg}</p>
      )}
    </div>
  );
}
