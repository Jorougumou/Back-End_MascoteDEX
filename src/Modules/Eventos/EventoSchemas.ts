import { z } from "zod";
import { textoSemHtml } from "@/Shared/Schemas/Common";

const dataSchema = z.iso.date();

export const criarEventoBodySchema = z
  .object({
    nome: textoSemHtml(2, 120),
    local: textoSemHtml(2, 160),
    dataInicio: dataSchema,
    dataFim: dataSchema,
  })
  // RN011: dataFim >= dataInicio (YYYY-MM-DD compara certo como texto)
  .refine((dados) => dados.dataFim >= dados.dataInicio, {
    path: ["dataFim"],
    message: "dataFim não pode ser anterior a dataInicio",
  });

export const eventoSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  local: z.string(),
  dataInicio: z.string(),
  dataFim: z.string(),
  criadoEm: z.string(),
});

export type CriarEventoBody = z.infer<typeof criarEventoBodySchema>;
export type Evento = z.infer<typeof eventoSchema>;
