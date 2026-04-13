import { requireRole } from "@/lib/auth/require-role";

export default async function AdminPage() {
  await requireRole(["admin"]);

  return <div>Admin Dashboard</div>;
}
