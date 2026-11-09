import { z } from "zod";

export const capturaParamsSchema = z.object({
  id: z.uuid(),
});

export const criarCapturaCamposSchema = z.object({
  eventoId: z.uuid(),
  capturadoEm: z.iso
    .datetime({ offset: true })
    .transform((valor) => new Date(valor))
    .optional(),
});

export const criarCapturaBodyDocSchema = z.object({
  foto: z.file().describe("Foto da captura (JPEG, PNG ou WebP, até 10 MB)."),
  eventoId: z.uuid().describe("Evento em que a captura aconteceu."),
  capturadoEm: z
    .string()
    .optional()
    .describe("Data/hora ISO 8601 com offset; padrão: agora."),
});

export const capturaSchema = z.object({
  id: z.uuid(),
  mascoteId: z.uuid(),
  eventoId: z.uuid(),
  fotoUrl: z.url(),
  capturadoEm: z.string().datetime({ offset: true }),
  sincronizadoEm: z.string().datetime({ offset: true }),
});

export type CriarCapturaCampos = z.infer<typeof criarCapturaCamposSchema>;

export type Captura = z.infer<typeof capturaSchema>;
