import { contemHtml } from "@/Shared/Utils/Sanitize";
import { z } from "zod";

export const ErrorResponseSchema = z.object({
  statusCode: z.number(),
  code: z.string(),
  message: z.string(),
  details: z.unknown().nullable(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export function paginatedResponseSchema<T extends z.ZodType>(item: T) {
  return z.object({
    data: z.array(item),
    meta: paginationMetaSchema,
  });
}

export function textoSemHtml(min: number, max: number) {
  return z
    .string()
    .trim()
    .min(min, `deve ter no mínimo ${min} caracteres`)
    .max(max, `deve ter no máximo ${max} caracteres`)
    .refine((valor) => !contemHtml(valor), "não pode conter < ou >");
}

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
