import IssueStockForm from "@/components/Forms/warehouse/issueStockForm";
import { requireRole } from "@/lib/auth/require-role";

export default async function IssueStockPage() {
  await requireRole(["admin"]);

  return <IssueStockForm />;
}
