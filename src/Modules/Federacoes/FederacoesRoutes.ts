import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "@/Shared/Plugins/AuthPlugin";
import { ErrorResponseSchema } from "@/Shared/Schemas/Common";
import type { FederacaoService } from "./FederacoesService";
import {
  federacaoSchema,
  getFederacaoParamsSchema,
  listarFederacoesQuerySchema,
  listarFederacoesResponseSchema,
} from "./FederacoesSchemas";

interface FederacaoRoutesOptions {
  federacaoService: FederacaoService;
}

export const federacaoRoutes: FastifyPluginAsync<
  FederacaoRoutesOptions
> = async (app, { federacaoService }) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get(
    "/federacoes",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Federações"],
        summary: "Listar Federações",
        description:
          "Retorna uma lista paginada de Federações com suporte a busca parcial por nome, sigla, estado ou região.",
        security: [{ bearerAuth: [] }],
        querystring: listarFederacoesQuerySchema,
        response: {
          200: listarFederacoesResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const resultado = await federacaoService.listar(request.query);
      return reply.status(200).send(resultado);
    },
  );

  typedApp.get(
    "/federacoes/:id",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Federações"],
        summary: "Buscar Federação por ID",
        description:
          "Retorna os dados cadastrais de uma Federação específica pelo seu ID.",
        security: [{ bearerAuth: [] }],
        params: getFederacaoParamsSchema,
        response: {
          200: federacaoSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const federacao = await federacaoService.obterPorId(id);
      return reply.status(200).send(federacao);
    },
  );
};