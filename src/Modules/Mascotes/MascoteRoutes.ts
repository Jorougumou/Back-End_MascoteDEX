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
  cadastrarMascoteBodyDocSchema,
  cadastrarMascoteCamposSchema,
  galeriaQuerySchema,
  galeriaResponseSchema,
  mascoteParamsSchema,
  mascotePerfilSchema,
} from "./MascoteSchemas";
import type { MascoteService } from "./MascoteService";

interface MascoteRoutesOptions {
  mascoteService: MascoteService;
}

export const mascoteRoutes: FastifyPluginAsync<MascoteRoutesOptions> = async (
  app,
  { mascoteService },
) => {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/mascotes",
    {
      preHandler: authenticate,
      validatorCompiler: validatorCompilerMultipart,
      schema: {
        tags: ["Mascotes"],
        summary: "Cadastra um mascote e registra a 1ª captura",
        description:
          "`multipart/form-data`. Campos: `foto` (arquivo JPEG/PNG/WebP até 10 MB, formato conferido pelo conteúdo), `nome`, `eventoId`, `capturadoEm?` (ISO 8601 UTC; padrão: agora) e **uma** das opções de EJ: `empresaJuniorId` (EJ existente) **ou** `ejNome` + `ejUniversidade` + `ejFederacaoId` (+ `ejCuriosidades?`, `confirmarNovaEj?`) para criar uma EJ nova. Cria o mascote e a primeira captura do usuário no evento (RN009). Erros de negócio: `409 MASCOTE_JA_CADASTRADO` (`details.mascoteId`; registre uma captura), `409 EJ_DUPLICADA`, `409 EJ_SIMILARES_ENCONTRADAS` (`details.sugestoes`; reenvie com `confirmarNovaEj=true` para criar mesmo assim) e `404` para evento, EJ ou federação inexistentes. Não envie fotos com pessoas identificáveis.",
        security: [{ bearerAuth: [] }],
        consumes: ["multipart/form-data"],
        body: cadastrarMascoteBodyDocSchema,
        response: {
          201: mascotePerfilSchema,
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
      const dados = validarCampos(cadastrarMascoteCamposSchema, campos);

      if (!arquivo || arquivo.campo !== "foto") {
        throw new AppError(
          ErrorCodes.FOTO_INVALIDA,
          400,
          'A foto é obrigatória (campo "foto").',
        );
      }

      const perfil = await mascoteService.cadastrar({
        usuarioId: request.user.sub,
        foto: arquivo.buffer,
        dados,
      });

      return reply.status(201).send(perfil);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    "/mascotes",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Mascotes"],
        summary: "Galeria paginada de mascotes, com filtros",
        description:
          "Lista os mascotes catalogados (foto, nome, EJ e federação), mais recentes primeiro. O campo `capturado` indica se o usuário logado já capturou o mascote. Filtros opcionais e combináveis (RN013): `estado` (sigla, ex.: SP), `federacaoId`, `empresaJunior` (nome parcial, sem acento e sem diferenciar maiúsculas) e `minhaColecao` (apenas mascotes já capturados por você). Sem resultados, devolve `data: []` e `total: 0`.",
        security: [{ bearerAuth: [] }],
        querystring: galeriaQuerySchema,
        response: {
          200: galeriaResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request) =>
      mascoteService.listarGaleria(request.user.sub, request.query),
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    "/mascotes/:id",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Mascotes"],
        summary: "Perfil detalhado do mascote",
        description:
          "Retorna foto, nome, EJ (com universidade e curiosidades), federação/região e os eventos, com datas, em que o mascote foi capturado (mais recentes primeiro; cada evento aparece uma vez). O campo `capturado` indica se o usuário logado já capturou o mascote (mesma regra da galeria). Mascote inexistente retorna 404.",
        security: [{ bearerAuth: [] }],
        params: mascoteParamsSchema,
        response: {
          200: mascotePerfilSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request) =>
      mascoteService.buscarPerfil(request.params.id, request.user.sub),
  );
};
