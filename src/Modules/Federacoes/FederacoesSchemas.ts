import { z } from "zod";

export const getFederacaoParamsSchema = z.object({
  id: z.uuid("ID inválido"),
});

export const federacaoSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  sigla: z.string(),
  estado: z.string(),
  regiao: z.string(),
});

export const listarFederacoesQuerySchema = z.object({
  busca: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const listarFederacoesResponseSchema = z.object({
  dados: z.array(federacaoSchema),
  paginacao: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export type GetFederacaoParams = z.infer<typeof getFederacaoParamsSchema>;
export type FederacaoDto = z.infer<typeof federacaoSchema>;
export type ListarFederacoesQuery = z.infer<typeof listarFederacoesQuerySchema>;
export type ListarFederacoesResponseDto = z.infer<typeof listarFederacoesResponseSchema>;