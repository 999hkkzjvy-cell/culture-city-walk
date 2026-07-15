import { z } from "zod";

export const shareCodeSchema = z
  .string()
  .trim()
  .min(10)
  .max(24)
  .regex(/^[a-z0-9_-]+$/i);

export const routeTitleSchema = z.string().trim().min(1).max(80);

export const routeIdSchema = z.string().trim().min(1);

export const cloudRouteIdSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

export function parseShareCode(value: string | null) {
  const result = shareCodeSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function isCloudRouteId(value?: string | null) {
  return cloudRouteIdSchema.safeParse(value).success;
}
