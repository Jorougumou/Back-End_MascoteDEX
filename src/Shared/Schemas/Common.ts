import { z } from "zod";

export const ErrorResponseSchema = z.object({
  statusCode: z.number(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().nullable(),
});
