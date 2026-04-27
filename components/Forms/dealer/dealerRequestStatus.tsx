import RequestStatus from "@/components/Forms/shared/requestStatus";

export default function DealerRequestsStatus({ dealerCode }: { dealerCode: string }) {
  return <RequestStatus targetCode={dealerCode} targetType="dealer" />;
}