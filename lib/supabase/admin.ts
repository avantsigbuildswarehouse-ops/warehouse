import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ROLE!, // MUST be this (NOT anon)
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
