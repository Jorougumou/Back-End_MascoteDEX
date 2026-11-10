import { z } from "zod";
import {
  paginatedResponseSchema,
  paginationQuerySchema,
} from "@/Shared/Schemas/Common";

export const rankingQuerySchema = paginationQuerySchema.extend({
  eventoId: z
    .uuid()
    .optional()
    .describe("Se informado, ranking só das capturas deste evento."),
});

export const rankingItemSchema = z.object({
  posicao: z.number().int(),
  usuarioId: z.uuid(),
  nome: z.string(),
  total: z.number().int(),
});

export const rankingMeSchema = z
  .object({
    posicao: z.number().int(),
    total: z.number().int(),
  })
  .nullable();

export const rankingResponseSchema = paginatedResponseSchema(
  rankingItemSchema,
).extend({
  me: rankingMeSchema,
});

export type RankingQuery = z.infer<typeof rankingQuerySchema>;
export type RankingItem = z.infer<typeof rankingItemSchema>;
export type RankingMe = z.infer<typeof rankingMeSchema>;
export type RankingResponse = z.infer<typeof rankingResponseSchema>;
