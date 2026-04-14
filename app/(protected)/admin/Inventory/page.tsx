import VehicleInventoryForm from "@/components/Forms/vehicleInventory";
import { requireRole } from "@/lib/auth/require-role";

export default async function InventoryPage() {
  await requireRole(["admin"]);

  return <VehicleInventoryForm />;
}
