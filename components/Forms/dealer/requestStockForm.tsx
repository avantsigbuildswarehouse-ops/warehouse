"use client";

import { useParams } from "next/navigation";
import RequestStockForm from "@/components/Forms/shared/requestStockForm";

export default function DealerRequestStockForm() {
  const params = useParams();
  const dealerCode = (params.dealerCode as string) || "";

  return (
    <RequestStockForm
      config={{
        targetCodeLabel: "dealer",
        targetCodeValue: dealerCode,
        fetchBikesUrl: "/api/dealers/request/bikes",
        fetchSparesUrl: "/api/dealers/request/spares",
        submitUrl: "/api/dealers/request",
      }}
    />
  );
}