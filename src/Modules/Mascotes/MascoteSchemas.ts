import { z } from "zod";
import {
  paginatedResponseSchema,
  paginationQuerySchema,
  textoSemHtml,
} from "@/Shared/Schemas/Common";

export const mascoteGaleriaSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  fotoUrl: z.string(),
  empresaJunior: z.object({
    id: z.uuid(),
    nome: z.string(),
  }),
  federacao: z.object({
    nome: z.string(),
    sigla: z.string(),
    estado: z.string(),
  }),
  capturado: z.boolean(),
});

// RF006, RN013: todos os filtros são opcionais e podem ser combinados.
export const galeriaQuerySchema = paginationQuerySchema.extend({
  estado: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "o estado deve ter 2 letras (ex.: SP)")
    .transform((valor) => valor.toUpperCase())
    .optional(),
  federacaoId: z.uuid().optional(),
  empresaJunior: textoSemHtml(1, 120).optional(),
  // z.coerce.boolean() trataria "false" como true; por isso o enum explícito.
  minhaColecao: z
    .enum(["true", "false"])
    .transform((valor) => valor === "true")
    .default(false),
});

export const galeriaResponseSchema =
  paginatedResponseSchema(mascoteGaleriaSchema);

export const mascoteParamsSchema = z.object({
  id: z.uuid(),
});

// RF007, RN017: evento em que o mascote foi capturado (datas em YYYY-MM-DD).
export const eventoDoMascoteSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  local: z.string(),
  dataInicio: z.string(),
  dataFim: z.string(),
});

export const mascotePerfilSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  fotoUrl: z.string(),
  // Mesma regra da galeria (RF005): o usuário logado já capturou este mascote.
  capturado: z.boolean(),
  empresaJunior: z.object({
    id: z.uuid(),
    nome: z.string(),
    universidade: z.string(),
    curiosidades: z.string().nullable(),
  }),
  federacao: z.object({
    nome: z.string(),
    sigla: z.string(),
    estado: z.string(),
    regiao: z.string(),
  }),
  eventos: z.array(eventoDoMascoteSchema),
});

export type MascoteGaleria = z.infer<typeof mascoteGaleriaSchema>;
export type GaleriaQuery = z.infer<typeof galeriaQuerySchema>;
export type MascotePerfil = z.infer<typeof mascotePerfilSchema>;
