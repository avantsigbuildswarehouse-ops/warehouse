import SparesInventory from "@/components/Forms/warehouse/sparesInventory";
import { requireRole } from "@/lib/auth/require-role";

export default async function SparesPage() {
  await requireRole(["admin"]);

  return <SparesInventory />;
}
