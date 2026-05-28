export type AdminCredentials = {
  adminEmail: string;
  adminPassword: string;
};

export type ProfileRole =
  | "admin"
  | "dealer-admin"
  | "dealer-finance"
  | "showroom-admin"
  | "showroom-finance";

export type ProfileRecord = {
  id: string;
  email: string;
  role: ProfileRole | string;
  code: string | null;
  created_at: string;
};

export type PartnerCodeOption = {
  code: string;
  label: string;
  type: "dealer" | "showroom";
};

export type AdminDeleteTarget =
  | "dealer"
  | "showroom"
  | "warehouse_vehicle"
  | "warehouse_spare"
  | "vehicle_model"
  | "spare_model"
  | "customer"
  | "company"
  | "sales_order"
  | "customer_document"
  | "company_document"
  | "dealer_document"
  | "showroom_document"
  | "dealer_vehicle_request"
  | "dealer_spare_request"
  | "showroom_vehicle_request"
  | "showroom_spare_request";
