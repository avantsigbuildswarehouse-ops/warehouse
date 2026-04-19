import VehicleInventoryForm from "@/components/Forms/warehouse/vehicleInventory";
import { requireRole } from "@/lib/auth/require-role";

export default async function InventoryPage() {
  await requireRole(["admin"]);

  return <VehicleInventoryForm />;
}
