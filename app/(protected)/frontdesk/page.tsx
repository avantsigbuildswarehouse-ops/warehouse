import { requireRole } from "@/lib/auth/require-role";

export default async function FrontdeskPage() {
  await requireRole(["admin", "frontdesk"]);

  return <div>Frontdesk Dashboard</div>;
}
