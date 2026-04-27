"use client";

import { useParams } from "next/navigation";
import RequestStockForm from "@/components/Forms/shared/requestStockForm";

export default function ShowroomRequestStockForm() {
  const params = useParams();
  const showroomCode = (params.showroomCode as string) || "";

  return (
    <RequestStockForm
      config={{
        targetCodeLabel: "showroom",
        targetCodeValue: showroomCode,
        fetchBikesUrl: "/api/showrooms/request/bikes",
        fetchSparesUrl: "/api/showrooms/request/spares",
        submitUrl: "/api/showrooms/request",
      }}
    />
  );
}