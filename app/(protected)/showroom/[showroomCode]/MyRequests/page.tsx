import ShowroomRequestStatus from '@/components/Forms/showroom/showroomRequestStatus';

interface Props {
  params: Promise<{
    showroomCode: string;
  }>;
}

export default async function MyRequestsPage({ params }: Props) {
  const { showroomCode } = await params;
  return <ShowroomRequestStatus showroomCode={showroomCode} />;
}