import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createClient() {
    const cookieStore = cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                async get(name) {
                    return  (await cookieStore).get(name)?.value;
                }
            }
        }
    );
}