import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/sidebar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email, code")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? null;
  const email = profile?.email ?? null;
  const code = profile?.code ?? null;

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar role={role} email={email} code={code} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
