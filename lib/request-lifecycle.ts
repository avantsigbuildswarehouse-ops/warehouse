import { supabaseAdmin } from "@/lib/supabase/admin";

type RequestStatus = "PENDING" | "APPROVED" | "HOLD" | "ISSUED" | "REJECTED";
type RequestKind = "dealer" | "showroom";
type RequestItemType = "Bike" | "Spare";

type VehicleRequestRow = {
  reference_no: string;
  requested_at: string;
  status: RequestStatus;
  remarks: string | null;
  price: number | string | null;
  model_code: string;
  engine_number: string;
  chassis_number: string;
  color: string | null;
  yom: string | null;
  version: string | null;
  dealer_code?: string;
  showroom_code?: string;
};

type SpareRequestRow = {
  reference_no: string;
  requested_at: string;
  status: RequestStatus;
  remarks: string | null;
  price: number | string | null;
  model_code: string;
  spare_code: string;
  serial_number: string;
  dealer_code?: string;
  showroom_code?: string;
};

export type AdminRequestGroup = {
  referenceNo: string;
  requestKind: RequestKind;
  targetCode: string;
  itemType: RequestItemType;
  status: RequestStatus;
  requestedAt: string;
  expiresAt: string;
  itemsCount: number;
  totalValue: number;
  remarks: string | null;
  items: Array<Record<string, unknown>>;
};

const ACTIVE_STATUSES: RequestStatus[] = ["PENDING", "APPROVED", "HOLD"];
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const batchRef = (referenceNo: string) => referenceNo.replace(/-\d{2}$/, "");

const batchLike = (referenceNo: string) => `${batchRef(referenceNo)}-%`;

const computeExpiry = (requestedAt: string) => new Date(new Date(requestedAt).getTime() + THREE_DAYS_MS).toISOString();

export async function cleanupExpiredRequests() {
  const now = Date.now();

  const [dealerVehicle, dealerSpare, showroomVehicle, showroomSpare] = await Promise.all([
    supabaseAdmin.from("dealer_vehicle_requests").select("*").in("status", ACTIVE_STATUSES),
    supabaseAdmin.from("dealer_spare_requests").select("*").in("status", ACTIVE_STATUSES),
    supabaseAdmin.from("showroom_vehicle_requests").select("*").in("status", ACTIVE_STATUSES),
    supabaseAdmin.from("showroom_spare_requests").select("*").in("status", ACTIVE_STATUSES),
  ]);

  const errors = [dealerVehicle.error, dealerSpare.error, showroomVehicle.error, showroomSpare.error].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors[0]?.message || "Failed to load request rows");
  }

  const expiredRefs = new Set<string>();
  const allRows = [
    ...(dealerVehicle.data || []),
    ...(dealerSpare.data || []),
    ...(showroomVehicle.data || []),
    ...(showroomSpare.data || []),
  ] as Array<{ reference_no: string; requested_at: string }>;

  allRows.forEach((row) => {
    const expiresAt = new Date(row.requested_at).getTime() + THREE_DAYS_MS;
    if (expiresAt <= now) {
      expiredRefs.add(batchRef(row.reference_no));
    }
  });

  for (const ref of expiredRefs) {
    await releaseRequest(ref);
  }

  return { releasedCount: expiredRefs.size };
}

export async function getAdminRequestGroups() {
  await cleanupExpiredRequests();

  const [dealerVehicle, dealerSpare, showroomVehicle, showroomSpare] = await Promise.all([
    supabaseAdmin.from("dealer_vehicle_requests").select("*").in("status", ACTIVE_STATUSES),
    supabaseAdmin.from("dealer_spare_requests").select("*").in("status", ACTIVE_STATUSES),
    supabaseAdmin.from("showroom_vehicle_requests").select("*").in("status", ACTIVE_STATUSES),
    supabaseAdmin.from("showroom_spare_requests").select("*").in("status", ACTIVE_STATUSES),
  ]);

  const errors = [dealerVehicle.error, dealerSpare.error, showroomVehicle.error, showroomSpare.error].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors[0]?.message || "Failed to load request rows");
  }

  const groups = new Map<string, AdminRequestGroup>();

  const addGroupItem = (
    row: VehicleRequestRow | SpareRequestRow,
    requestKind: RequestKind,
    itemType: RequestItemType,
    targetCode: string,
  ) => {
    const ref = batchRef(row.reference_no);
    const key = `${requestKind}__${itemType}__${ref}`;
    if (!groups.has(key)) {
      groups.set(key, {
        referenceNo: ref,
        requestKind,
        targetCode,
        itemType,
        status: row.status,
        requestedAt: row.requested_at,
        expiresAt: computeExpiry(row.requested_at),
        itemsCount: 0,
        totalValue: 0,
        remarks: row.remarks || null,
        items: [],
      });
    }

    const group = groups.get(key)!;
    group.items.push(row as Record<string, unknown>);
    group.itemsCount += 1;
    group.totalValue += Number(row.price || 0);
    group.status = row.status || group.status;
    if (new Date(row.requested_at) < new Date(group.requestedAt)) {
      group.requestedAt = row.requested_at;
      group.expiresAt = computeExpiry(row.requested_at);
    }
    if (row.remarks && !group.remarks) group.remarks = row.remarks;
  };

  (dealerVehicle.data as VehicleRequestRow[] | null)?.forEach((row) =>
    addGroupItem(row, "dealer", "Bike", row.dealer_code || ""),
  );
  (dealerSpare.data as SpareRequestRow[] | null)?.forEach((row) =>
    addGroupItem(row, "dealer", "Spare", row.dealer_code || ""),
  );
  (showroomVehicle.data as VehicleRequestRow[] | null)?.forEach((row) =>
    addGroupItem(row, "showroom", "Bike", row.showroom_code || ""),
  );
  (showroomSpare.data as SpareRequestRow[] | null)?.forEach((row) =>
    addGroupItem(row, "showroom", "Spare", row.showroom_code || ""),
  );

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );
}

export async function updateRequestStatus(referenceNo: string, status: RequestStatus) {
  const like = batchLike(referenceNo);
  const requestedAt = status === "HOLD" ? new Date().toISOString() : undefined;

  const updatePayload = requestedAt ? { status, requested_at: requestedAt } : { status };

  const [dealerVehicle, dealerSpare, showroomVehicle, showroomSpare] = await Promise.all([
    supabaseAdmin.from("dealer_vehicle_requests").update(updatePayload).like("reference_no", like),
    supabaseAdmin.from("dealer_spare_requests").update(updatePayload).like("reference_no", like),
    supabaseAdmin.from("showroom_vehicle_requests").update(updatePayload).like("reference_no", like),
    supabaseAdmin.from("showroom_spare_requests").update(updatePayload).like("reference_no", like),
  ]);

  const errors = [dealerVehicle.error, dealerSpare.error, showroomVehicle.error, showroomSpare.error].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors[0]?.message || "Failed to update request status");
  }
}

export async function releaseRequest(referenceNo: string) {
  const like = batchLike(referenceNo);

  const [vehicleInv, spareInv, dealerVehicleDelete, dealerSpareDelete, showroomVehicleDelete, showroomSpareDelete] =
    await Promise.all([
      supabaseAdmin
        .schema("warehouse")
        .from("vehicle_inventory")
        .update({ status: "AVAILABLE", requested_by: null, requested_at: null, request_reference: null })
        .eq("status", "REQUESTED")
        .eq("request_reference", referenceNo),
      supabaseAdmin
        .schema("warehouse")
        .from("vehicle_spare_inventory")
        .update({ status: "AVAILABLE", requested_by: null, requested_at: null, request_reference: null })
        .eq("status", "REQUESTED")
        .eq("request_reference", referenceNo),
      supabaseAdmin.from("dealer_vehicle_requests").delete().like("reference_no", like),
      supabaseAdmin.from("dealer_spare_requests").delete().like("reference_no", like),
      supabaseAdmin.from("showroom_vehicle_requests").delete().like("reference_no", like),
      supabaseAdmin.from("showroom_spare_requests").delete().like("reference_no", like),
    ]);

  const errors = [
    vehicleInv.error,
    spareInv.error,
    dealerVehicleDelete.error,
    dealerSpareDelete.error,
    showroomVehicleDelete.error,
    showroomSpareDelete.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors[0]?.message || "Failed to release request");
  }
}

export async function issueRequest(referenceNo: string) {
  const like = batchLike(referenceNo);
  const issuedAt = new Date().toISOString();

  const [dealerVehicle, dealerSpare, showroomVehicle, showroomSpare] = await Promise.all([
    supabaseAdmin.from("dealer_vehicle_requests").select("*").like("reference_no", like).in("status", ["APPROVED", "HOLD"]),
    supabaseAdmin.from("dealer_spare_requests").select("*").like("reference_no", like).in("status", ["APPROVED", "HOLD"]),
    supabaseAdmin.from("showroom_vehicle_requests").select("*").like("reference_no", like).in("status", ["APPROVED", "HOLD"]),
    supabaseAdmin.from("showroom_spare_requests").select("*").like("reference_no", like).in("status", ["APPROVED", "HOLD"]),
  ]);

  const errors = [dealerVehicle.error, dealerSpare.error, showroomVehicle.error, showroomSpare.error].filter(Boolean);
  if (errors.length > 0) throw new Error(errors[0]?.message || "Failed to load request for issuing");

  const dv = (dealerVehicle.data || []) as VehicleRequestRow[];
  const ds = (dealerSpare.data || []) as SpareRequestRow[];
  const sv = (showroomVehicle.data || []) as VehicleRequestRow[];
  const ss = (showroomSpare.data || []) as SpareRequestRow[];

  if (dv.length + ds.length + sv.length + ss.length === 0) {
    throw new Error("No approved request rows found for this reference");
  }

  const showroomVehicleInsert = sv.map((row) => ({
    showroom_code: row.showroom_code,
    model_code: row.model_code,
    engine_number: row.engine_number,
    chassis_number: row.chassis_number,
    color: row.color,
    yom: row.yom,
    version: row.version,
    price: row.price,
    issued_at: issuedAt,
  }));

  const dealerVehicleInsert = dv.map((row) => ({
    dealer_code: row.dealer_code,
    model_code: row.model_code,
    engine_number: row.engine_number,
    chassis_number: row.chassis_number,
    color: row.color,
    yom: row.yom,
    version: row.version,
    price: row.price,
    issued_at: issuedAt,
  }));

  const showroomSpareInsert = ss.map((row) => ({
    showroom_code: row.showroom_code,
    model_code: row.model_code,
    spare_code: row.spare_code,
    serial_number: row.serial_number,
    price: row.price,
    issued_at: issuedAt,
  }));

  const dealerSpareInsert = ds.map((row) => ({
    dealer_code: row.dealer_code,
    model_code: row.model_code,
    spare_code: row.spare_code,
    serial_number: row.serial_number,
    price: row.price,
    issued_at: issuedAt,
  }));

  const [insSv, insDv, insSs, insDs] = await Promise.all([
    showroomVehicleInsert.length
      ? supabaseAdmin.schema("ASB showrooms").from("showroom_vehicle_inventory").insert(showroomVehicleInsert)
      : Promise.resolve({ error: null }),
    dealerVehicleInsert.length
      ? supabaseAdmin.schema("ASB showrooms").from("dealer_vehicle_inventory").insert(dealerVehicleInsert)
      : Promise.resolve({ error: null }),
    showroomSpareInsert.length
      ? supabaseAdmin.schema("ASB showrooms").from("showroom_spare_inventory").insert(showroomSpareInsert)
      : Promise.resolve({ error: null }),
    dealerSpareInsert.length
      ? supabaseAdmin.schema("ASB showrooms").from("dealer_spare_inventory").insert(dealerSpareInsert)
      : Promise.resolve({ error: null }),
  ]);

  const insertErrors = [insSv.error, insDv.error, insSs.error, insDs.error].filter(Boolean);
  if (insertErrors.length > 0) throw new Error(insertErrors[0]?.message || "Failed to insert issued inventory");

  const [upVeh, upSp, upDv, upDs, upSv, upSs] = await Promise.all([
    supabaseAdmin
      .schema("warehouse")
      .from("vehicle_inventory")
      .update({ status: "ISSUED", issued_at: issuedAt })
      .eq("request_reference", referenceNo),
    supabaseAdmin
      .schema("warehouse")
      .from("vehicle_spare_inventory")
      .update({ status: "ISSUED", issued_at: issuedAt })
      .eq("request_reference", referenceNo),
    supabaseAdmin.from("dealer_vehicle_requests").update({ status: "ISSUED" }).like("reference_no", like),
    supabaseAdmin.from("dealer_spare_requests").update({ status: "ISSUED" }).like("reference_no", like),
    supabaseAdmin.from("showroom_vehicle_requests").update({ status: "ISSUED" }).like("reference_no", like),
    supabaseAdmin.from("showroom_spare_requests").update({ status: "ISSUED" }).like("reference_no", like),
  ]);

  const updateErrors = [upVeh.error, upSp.error, upDv.error, upDs.error, upSv.error, upSs.error].filter(Boolean);
  if (updateErrors.length > 0) throw new Error(updateErrors[0]?.message || "Failed to finalize issuing");

  return { issuedCount: dv.length + ds.length + sv.length + ss.length };
}
