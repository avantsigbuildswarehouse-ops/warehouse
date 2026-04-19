import { z } from "zod";

export const spareSchema = z.object({
  serialNumber: z.string().min(1, "Serial required"),
});

export const vehicleSpareSchema = z.object({
  modelCode: z.string().min(1),
  spareCode: z.string().min(1),
  spares: z.array(spareSchema).min(1),
});

export type VehicleSpareFormValues =
  z.infer<typeof vehicleSpareSchema>;
