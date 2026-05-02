import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            res.cookies.set(name, value);
          });
        },
      },
    }
  );

  try {
    await supabase.auth.getUser();
  } catch {
    // Avoid failing the whole request when Supabase is temporarily unavailable.
    return res;
  }

  return res;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dealer/:path*",
    "/showroom/:path*",
    "/dashboard/:path*",
    "/frontdesk/:path*",
    "/api/:path*",
  ],
};
