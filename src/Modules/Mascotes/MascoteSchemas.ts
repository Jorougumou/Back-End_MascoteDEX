import { z } from "zod";
import {
  paginatedResponseSchema,
  paginationQuerySchema,
  textoSemHtml,
} from "@/Shared/Schemas/Common";
import { sanitizarTexto } from "@/Shared/Utils/Sanitize";

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

export const galeriaQuerySchema = paginationQuerySchema.extend({
  estado: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "o estado deve ter 2 letras (ex.: SP)")
    .transform((valor) => valor.toUpperCase())
    .optional(),
  federacaoId: z.uuid().optional(),
  empresaJunior: textoSemHtml(1, 120).optional(),
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

function textoLimpo(min: number, max: number) {
  return textoSemHtml(min, max)
    .transform(sanitizarTexto)
    .pipe(z.string().min(min, `deve ter no mínimo ${min} caracteres`));
}

export type EmpresaJuniorEscolhida =
  | { tipo: "existente"; id: string }
  | {
      tipo: "nova";
      nome: string;
      universidade: string;
      federacaoId: string;
      curiosidades: string | undefined;
      confirmarSimilares: boolean;
    };

export const cadastrarMascoteCamposSchema = z
  .object({
    nome: textoLimpo(2, 120),
    eventoId: z.uuid(),
    capturadoEm: z.iso
      .datetime({ offset: true })
      .transform((valor) => new Date(valor))
      .optional(),
    empresaJuniorId: z.uuid().optional(),
    ejNome: textoLimpo(2, 120).optional(),
    ejUniversidade: textoLimpo(2, 160).optional(),
    ejFederacaoId: z.uuid().optional(),
    ejCuriosidades: textoLimpo(1, 1000).optional(),
    confirmarNovaEj: z
      .enum(["true", "false"])
      .transform((valor) => valor === "true")
      .default(false),
  })
  .transform(
    (
      campos,
      ctx,
    ): {
      nome: string;
      eventoId: string;
      capturadoEm: Date | undefined;
      empresaJunior: EmpresaJuniorEscolhida;
    } => {
      const { ejNome, ejUniversidade, ejFederacaoId, ejCuriosidades } = campos;

      const informouNova = [
        ejNome,
        ejUniversidade,
        ejFederacaoId,
        ejCuriosidades,
      ].some((valor) => valor !== undefined);

      const rejeitar = (campo: string, mensagem: string) =>
        ctx.issues.push({
          code: "custom",
          message: mensagem,
          input: campos,
          path: [campo],
        });

      const base = {
        nome: campos.nome,
        eventoId: campos.eventoId,
        capturadoEm: campos.capturadoEm,
      };

      if (campos.empresaJuniorId) {
        if (informouNova) {
          rejeitar(
            "empresaJuniorId",
            "informe empresaJuniorId OU os dados da nova EJ (ej*), não os dois",
          );
          return z.NEVER;
        }

        return {
          ...base,
          empresaJunior: {
            tipo: "existente",
            id: campos.empresaJuniorId,
          },
        };
      }

      if (ejNome && ejUniversidade && ejFederacaoId) {
        return {
          ...base,
          empresaJunior: {
            tipo: "nova",
            nome: ejNome,
            universidade: ejUniversidade,
            federacaoId: ejFederacaoId,
            curiosidades: ejCuriosidades,
            confirmarSimilares: campos.confirmarNovaEj,
          },
        };
      }

      if (!informouNova) {
        rejeitar(
          "empresaJuniorId",
          "informe empresaJuniorId ou os dados da nova EJ (ejNome, ejUniversidade, ejFederacaoId)",
        );
        return z.NEVER;
      }

      const obrigatorios = { ejNome, ejUniversidade, ejFederacaoId };

      for (const [campo, valor] of Object.entries(obrigatorios)) {
        if (valor === undefined) {
          rejeitar(campo, "obrigatório quando a EJ é nova");
        }
      }

      return z.NEVER;
    },
  );

export const cadastrarMascoteBodyDocSchema = z.object({
  foto: z.file().describe("Foto do mascote (JPEG, PNG ou WebP, até 10 MB)."),
  nome: z.string().describe("Nome do mascote (2 a 120 caracteres)."),
  eventoId: z.uuid().describe("Evento em que o mascote foi capturado."),
  capturadoEm: z
    .string()
    .optional()
    .describe(
      "ISO 8601 com offset. Padrão: agora. Na sincronização offline, envie o horário original da captura.",
    ),
  empresaJuniorId: z
    .uuid()
    .optional()
    .describe("EJ já cadastrada. Use este campo OU os campos ej*."),
  ejNome: z.string().optional().describe("Nome da EJ nova."),
  ejUniversidade: z.string().optional().describe("Universidade da EJ nova."),
  ejFederacaoId: z.uuid().optional().describe("Federação da EJ nova."),
  ejCuriosidades: z.string().optional().describe("Curiosidades da EJ nova."),
  confirmarNovaEj: z
    .enum(["true", "false"])
    .optional()
    .describe("`true` ignora o aviso de EJs com nome parecido."),
});

export type CadastrarMascoteCampos = z.output<
  typeof cadastrarMascoteCamposSchema
>;
export type MascoteGaleria = z.infer<typeof mascoteGaleriaSchema>;
export type GaleriaQuery = z.infer<typeof galeriaQuerySchema>;
export type MascotePerfil = z.infer<typeof mascotePerfilSchema>;
