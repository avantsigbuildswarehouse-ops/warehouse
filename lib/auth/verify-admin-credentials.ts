import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function verifyAdminCredentials(email: unknown, password: unknown) {
  if (typeof email !== "string" || typeof password !== "string") {
    return false;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return false;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Missing Supabase public configuration");
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return false;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  return !profileError && profile?.role === "admin";
}
