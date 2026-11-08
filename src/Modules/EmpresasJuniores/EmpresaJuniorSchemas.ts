import { z } from "zod";
import { paginationQuerySchema } from "@/Shared/Schemas/Common";

export const empresaJuniorSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  universidade: z.string(),
  curiosidades: z.string().nullable(),
  federacaoId: z.uuid(),
});

export const listarEmpresasJunioresQuerySchema = paginationQuerySchema.extend({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((valor) => valor || undefined),
  federacaoId: z.uuid("federacaoId inválido").optional(),
});

export type EmpresaJunior = z.infer<typeof empresaJuniorSchema>;
export type ListarEmpresasJunioresQuery = z.infer<
  typeof listarEmpresasJunioresQuerySchema
>;
