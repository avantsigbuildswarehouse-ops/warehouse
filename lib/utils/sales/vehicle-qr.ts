import QRCode from "qrcode";

export type VehicleQrEntry = {
  engine_number: string;
  chassis_number: string;
  sold_at?: string;
};

type SalesItemLike = {
  type?: string;
  engine_number?: string | null;
  chassis_number?: string | null;
};

export function getAppBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_BASE_URL || "https://abs-sigma.vercel.app";
}

export function buildWarrantyVehicleUrl(entry: VehicleQrEntry, baseUrl?: string) {
  const origin = baseUrl || getAppBaseUrl();
  const params = new URLSearchParams({
    engine: entry.engine_number,
    chassis: entry.chassis_number,
    soldAt: entry.sold_at || "",
  });
  return `${origin}/warranty/vehicle?${params.toString()}`;
}

/** Single bike → warranty URL; multiple bikes → nested JSON for scanners. */
export function buildVehicleQrContent(vehicles: VehicleQrEntry[], baseUrl?: string): string {
  const bikes = vehicles.filter((v) => v.engine_number && v.chassis_number);
  if (bikes.length === 0) return "";
  if (bikes.length === 1) return buildWarrantyVehicleUrl(bikes[0], baseUrl);

  return JSON.stringify({
    vehicles: bikes.map((v, index) => ({
      label: `Vehicle ${index + 1}`,
      engine: v.engine_number,
      chassis: v.chassis_number,
      soldAt: v.sold_at || "",
    })),
  });
}

export function extractBikesFromSalesItems(
  items: SalesItemLike[] | undefined,
  soldAt?: string
): VehicleQrEntry[] {
  return (items || [])
    .filter((item) => item.type === "Bike")
    .map((item) => ({
      engine_number: item.engine_number || "",
      chassis_number: item.chassis_number || "",
      sold_at: soldAt,
    }))
    .filter((item) => item.engine_number && item.chassis_number);
}

export async function generateVehicleQrDataUrl(vehicles: VehicleQrEntry[], baseUrl?: string) {
  const content = buildVehicleQrContent(vehicles, baseUrl);
  if (!content) return "";
  return QRCode.toDataURL(content, { margin: 1, width: 256 });
}

export function buildBikeWarrantyQrResponse(
  bikes: Array<{ id: string; engine_number: string; chassis_number: string }>,
  soldAt: string,
  baseUrl?: string
) {
  const origin = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "";
  return bikes.map((bike) => ({
    inventoryId: bike.id,
    engine_number: bike.engine_number,
    chassis_number: bike.chassis_number,
    warranty_url: buildWarrantyVehicleUrl(
      { engine_number: bike.engine_number, chassis_number: bike.chassis_number, sold_at: soldAt },
      origin || undefined
    ),
  }));
}

export type MultiVehicleQrPayload = {
  vehicles: Array<{
    label: string;
    engine: string;
    chassis: string;
    soldAt: string;
  }>;
};

export function parseVehicleQrContent(raw: string): MultiVehicleQrPayload | null {
  try {
    const parsed = JSON.parse(raw) as MultiVehicleQrPayload;
    if (parsed?.vehicles && Array.isArray(parsed.vehicles)) return parsed;
  } catch {
    // not JSON
  }
  return null;
}
