import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import { authenticate } from "@/Shared/Plugins/AuthPlugin";
import { lerMultipart } from "@/Shared/Plugins/MultipartPlugin";
import { ErrorResponseSchema } from "@/Shared/Schemas/Common";
import {
  validarCampos,
  validatorCompilerMultipart,
} from "@/Shared/Utils/CamposMultipart";
import {
  capturaParamsSchema,
  capturaSchema,
  criarCapturaBodyDocSchema,
  criarCapturaCamposSchema,
} from "./CapturaSchemas";
import type { CapturaService } from "./CapturaService";

interface CapturaRoutesOptions {
  capturaService: CapturaService;
}

export const capturaRoutes: FastifyPluginAsync<CapturaRoutesOptions> = async (
  app,
  { capturaService },
) => {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/mascotes/:id/capturas",
    {
      preHandler: authenticate,
      validatorCompiler: validatorCompilerMultipart,
      schema: {
        tags: ["Capturas"],
        summary: "Registra uma captura de mascote em um evento",
        description:
          "`multipart/form-data`: `foto` (JPEG/PNG/WebP até 10 MB), `eventoId` e `capturadoEm?` (ISO 8601 com offset; padrão: horário atual). A unicidade é por usuário, mascote e evento (RN010). Reenvio retorna 409 CAPTURA_DUPLICADA sem novo upload. A foto é removida se a gravação falhar (RN015).",
        security: [{ bearerAuth: [] }],
        consumes: ["multipart/form-data"],
        params: capturaParamsSchema,
        body: criarCapturaBodyDocSchema,
        response: {
          201: capturaSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
          429: ErrorResponseSchema,
          502: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { campos, arquivo } = await lerMultipart(request);

      const dados = validarCampos(criarCapturaCamposSchema, campos);

      if (!arquivo || arquivo.campo !== "foto") {
        throw new AppError(
          ErrorCodes.FOTO_INVALIDA,
          400,
          'A foto é obrigatória (campo "foto").',
        );
      }

      const captura = await capturaService.registrar({
        usuarioId: request.user.sub,
        mascoteId: request.params.id,
        foto: arquivo.buffer,
        dados,
      });

      return reply.status(201).send(captura);
    },
  );
};
