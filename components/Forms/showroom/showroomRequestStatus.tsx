import RequestStatus from "@/components/Forms/shared/requestStatus";

export default function ShowroomRequestStatus({ showroomCode }: { showroomCode: string }) {
  return <RequestStatus targetCode={showroomCode} targetType="showroom" />;
}