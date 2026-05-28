//;
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const supabaseAdmin = getSupabaseAdmin();

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
function generateNextCode(codes: string[]) {
  const max = codes.reduce((highest, code) => {
    const match = code.match(/^ASB-SH-(\d+)$/);
    return match ? Math.max(highest, parseInt(match[1], 10)) : highest;
  }, 0);

  return `ASB-SH-${String(max + 1).padStart(3, "0")}`;
}

/**
 * Get all showrooms
 */
export async function getShowrooms(): Promise<Showroom[]> {
  const { data, error } = await supabaseAdmin
    .schema("asb_showrooms")
    .from("asb_showrooms")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) throw new Error(error.message);

  return data ?? [];
}

/**
 * Generate showroom code (DB based)
 */
export async function generateShowroomCode(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .schema("asb_showrooms")
    .from("asb_showrooms")
    .select("showroom_code")
    .order("showroom_code", { ascending: false });

  if (error) throw new Error(error.message);

  return generateNextCode((data ?? []).map((row) => row.showroom_code));
}

/**
 * Create showroom
 */
export async function createShowroom(input: {
  showroom_code?: string;
  city: string;
  state: string;
  address: string;
  is_active: boolean;
}) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const showroom_code = await generateShowroomCode();
    const { error } = await supabaseAdmin
      .schema("asb_showrooms")
      .from("asb_showrooms")
      .insert({ ...input, showroom_code });

    if (!error) return { showroom_code };

    lastError = new Error(error.message);
    if (error.code !== "23505") break;
  }

throw lastError ?? new Error("Failed to create showroom");
}
