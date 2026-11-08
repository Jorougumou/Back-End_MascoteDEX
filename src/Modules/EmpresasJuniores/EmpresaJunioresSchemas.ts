import { z } from "zod";

export const getEmpresaJunioresParamsSchema = z.object({
  id: z.uuid("ID inválido"),
});

export const empresaJunioresSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  nomeNormalizado: z.string(),
  universidade: z.string(),
  curiosidades: z.string().nullable(),
  federacaoId: z.uuid(),
});

export const listarEmpresasJunioresQuerySchema = z.object({
  busca: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const listarEmpresasJunioresResponseSchema = z.object({
  dados: z.array(empresaJunioresSchema),
  paginacao: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export type GetEmpresaJunioresParams = z.infer<typeof getEmpresaJunioresParamsSchema>;
export type EmpresaJunioresDto = z.infer<typeof empresaJunioresSchema>;
export type ListarEmpresasJunioresQuery = z.infer<typeof listarEmpresasJunioresQuerySchema>;
export type ListarEmpresasJunioresResponseDto = z.infer<typeof listarEmpresasJunioresResponseSchema>;