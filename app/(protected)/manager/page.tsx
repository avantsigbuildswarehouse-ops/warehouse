import { requireRole } from "@/lib/auth/require-role";

export default async function ManagerPage() {
  await requireRole(["admin", "manager"]);

  return <div>Manager Dashboard</div>;
}
