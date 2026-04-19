import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type Showroom = {
  showroom_code: string;
  city: string;
  state: string;
  address: string;
  is_active: boolean;
  created_at: string;
};

/**
 * Generate next showroom code
 */
function generateNextCode(last?: string) {
  if (!last) return "ASB-SH-001";

  const match = last.match(/ASB-SH-(\d+)/);
  const num = match ? parseInt(match[1], 10) + 1 : 1;

  return `ASB-SH-${String(num).padStart(3, "0")}`;
}

/**
 * Get all showrooms
 */
export async function getShowrooms(): Promise<Showroom[]> {
  const { data, error } = await supabaseAdmin
    .schema("ASB showrooms")
    .from("asb_showrooms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data ?? [];
}

/**
 * Generate showroom code (DB based)
 */
export async function generateShowroomCode(): Promise<string> {
  const { data } = await supabaseAdmin
    .schema("ASB showrooms")
    .from("asb_showrooms")
    .select("showroom_code")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return generateNextCode(data?.showroom_code);
}

/**
 * Create showroom
 */
export async function createShowroom(input: {
  showroom_code: string;
  city: string;
  state: string;
  address: string;
  is_active: boolean;
}) {
  const { error } = await supabaseAdmin
    .schema("ASB showrooms")
    .from("asb_showrooms")
    .insert(input);

  if (error) throw new Error(error.message);

  return true;
}
