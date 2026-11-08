import { z } from "zod";
import { paginationQuerySchema } from "@/Shared/Schemas/Common";

export const federacaoSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  sigla: z.string(),
  estado: z.string(),
  regiao: z.string(),
});

export const listarFederacoesQuerySchema = paginationQuerySchema.extend({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((valor) => valor || undefined),
  estado: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "estado deve ser a UF com 2 letras")
    .optional(),
});

export type Federacao = z.infer<typeof federacaoSchema>;
export type ListarFederacoesQuery = z.infer<typeof listarFederacoesQuerySchema>;
