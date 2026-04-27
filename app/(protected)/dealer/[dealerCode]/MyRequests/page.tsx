
import DealerRequestsStatus from '@/components/Forms/dealer/dealerRequestStatus';

interface Props {
  params: Promise<{
    dealerCode: string;
  }>;
}

export default async function MyRequestsPage({ params }: Props) {
  const { dealerCode } = await params;
  return <DealerRequestsStatus dealerCode={dealerCode} />;
}