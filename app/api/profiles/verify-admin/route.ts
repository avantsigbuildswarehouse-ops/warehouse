import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("verify-admin body:", body);

    const { email, password } = body;

    if (!email || !password) {
      console.log("Missing email or password:", { email, password });
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("signInWithPassword result:", { data, error });

    if (error || !data.user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check that the user is actually an admin
    const { data: profile, error: profileError } = await supabase
      .schema("public")
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    console.log("profile role check:", { profile, profileError });

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can perform this action" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("verify-admin caught error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}