import { randomUUID } from "crypto";

const compactToken = () => randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();

export const createBatchReference = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${compactToken()}`;

export const createLineReference = (batchReference: string, index: number) =>
  `${batchReference}-${String(index + 1).padStart(2, "0")}`;
