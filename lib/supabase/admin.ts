import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseAdminClient = SupabaseClient<any, any, any>;

let supabaseAdminInstance: SupabaseAdminClient | null = null;

export function getSupabaseAdmin(): SupabaseAdminClient {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ROLE;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ROLE)"
    );
  }

  supabaseAdminInstance = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminInstance;
}

export const supabaseAdmin = new Proxy({} as SupabaseAdminClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop, client);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
