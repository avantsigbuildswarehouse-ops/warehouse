import { z } from "zod";

export const spareSchema = z.object({
  serialNumber: z.string().min(1, "Serial required"),
});

export const vehicleSpareSchema = z.object({
  modelCode: z.string().min(1, "Please select a model"),
  spareCode: z.string().optional(),
  spares: z.array(spareSchema).min(1),
});

export type VehicleSpareFormValues =
  z.infer<typeof vehicleSpareSchema>;
