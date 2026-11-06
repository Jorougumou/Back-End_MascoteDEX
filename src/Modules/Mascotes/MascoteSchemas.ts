import { z } from "zod";
import { paginatedResponseSchema } from "@/Shared/Schemas/Common";

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

export const galeriaResponseSchema =
  paginatedResponseSchema(mascoteGaleriaSchema);

export type MascoteGaleria = z.infer<typeof mascoteGaleriaSchema>;