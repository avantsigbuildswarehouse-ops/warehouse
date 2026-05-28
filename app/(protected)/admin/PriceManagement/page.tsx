import PriceManagement from "@/components/Forms/warehouse/priceManagement";
import { requireRole } from "@/lib/auth/require-role";

export default async function PriceManagementPage() {
  await requireRole(["admin"]);

  return <PriceManagement />;
}
