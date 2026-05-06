export type SalesPdfItem = {
  type: "Bike" | "Spare";
  model_code: string;
  identifier?: string;
  price?: number;
  engine_number?: string | null;
  chassis_number?: string | null;
  color?: string | null;
  yom?: string | null;
  version?: string | null;
  spare_code?: string | null;
  serial_number?: string | null;
};

export function buildSalesItemIdentifier(item: SalesPdfItem) {
  if (item.type === "Bike") {
    return item.chassis_number || item.engine_number || item.identifier || "-";
  }

  return item.serial_number || item.spare_code || item.identifier || "-";
}

export function buildSalesItemDetails(item: SalesPdfItem) {
  if (item.type === "Bike") {
    const parts = [
      item.engine_number ? `ENG: ${item.engine_number}` : null,
      item.chassis_number ? `CHS: ${item.chassis_number}` : null,
      item.color ? `CLR: ${item.color}` : null,
      item.yom ? `YOM: ${item.yom}` : null,
      item.version ? `VER: ${item.version}` : null,
    ].filter(Boolean);

    return parts.join(" | ") || "Vehicle details unavailable";
  }

  const parts = [
    item.spare_code ? `CODE: ${item.spare_code}` : null,
    item.serial_number ? `SER: ${item.serial_number}` : null,
  ].filter(Boolean);

  return parts.join(" | ") || "Spare details unavailable";
}

export async function checkExistingSalesDocument({
  endpoint,
  idKey,
  idValue,
  documentType,
  documentNumber,
}: {
  endpoint: string;
  idKey: string;
  idValue: string;
  documentType: string;
  documentNumber: string;
}) {
  const params = new URLSearchParams({
    [idKey]: idValue,
    document_type: documentType,
    document_number: documentNumber,
  });

  const response = await fetch(`${endpoint}?${params.toString()}`);
  const data = await response.json();
  return Boolean(data.document);
}

export async function saveSalesDocumentReference({
  endpoint,
  buyerKey,
  buyerId,
  documentType,
  documentNumber,
  documentData,
}: {
  endpoint: string;
  buyerKey: string;
  buyerId: string;
  documentType: string;
  documentNumber: string;
  documentData: Record<string, unknown>;
}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      [buyerKey]: buyerId,
      document_type: documentType,
      document_number: documentNumber,
      document_data: documentData,
    }),
  });

  return response.json();
}
