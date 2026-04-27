export type RequestItemType = "Bike" | "Spare";

export type BikeItem = {
  model_code: string;
  model_name: string;
  engine_number: string;
  chassis_number: string;
  color: string;
  price: number;
};

export type SpareItem = {
  model_code: string;
  spare_code: string;
  spare_name: string;
  serial_number: string;
  price: number;
};

export type CartItem = {
  id: string;
  itemType: RequestItemType;
  modelCode: string;
  modelName: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  items: (BikeItem | SpareItem)[];
};

export type RequestResult = {
  itemCount: number;
  targetName: string;
  referenceNo: string;
};

export type RequestFormConfig = {
  targetCodeLabel: string;
  targetCodeValue: string;
  fetchBikesUrl: string;
  fetchSparesUrl: string;
  submitUrl: string;
};
