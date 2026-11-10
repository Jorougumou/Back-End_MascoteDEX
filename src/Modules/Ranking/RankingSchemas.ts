import { z } from "zod";

export const getRankingQuerySchema = z.object({
  eventoId: z.string().uuid().optional(),
});

export const rankingItemSchema = z.object({
  posicao: z.number().int().positive(),
  usuarioId: z.string().uuid(),
  nome: z.string(),
  totalMascotes: z.number().int().nonnegative(),
  ultimaCapturaEm: z.date(),
});

export const getRankingResponseSchema = z.object({
  ranking: z.array(rankingItemSchema),
  me: rankingItemSchema.nullable(),
});

export type GetRankingQuery = z.infer<typeof getRankingQuerySchema>;
export type GetRankingResponse = z.infer<typeof getRankingResponseSchema>;
