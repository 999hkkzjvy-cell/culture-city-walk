import { z } from "zod";

export const shareCodeSchema = z
  .string()
  .trim()
  .min(10)
  .max(24)
  .regex(/^[a-z0-9_-]+$/i);

export const routeTitleSchema = z.string().trim().min(1).max(80);

export const routeIdSchema = z.string().trim().min(1);

export function parseShareCode(value: string | null) {
  const result = shareCodeSchema.safeParse(value);
  return result.success ? result.data : null;
}
