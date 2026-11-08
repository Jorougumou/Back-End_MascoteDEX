import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "@/Shared/Plugins/AuthPlugin";
import {
  ErrorResponseSchema,
  paginatedResponseSchema,
} from "@/Shared/Schemas/Common";
import type { FederacaoService } from "./FederacaoService";
import {
  federacaoSchema,
  listarFederacoesQuerySchema,
} from "./FederacaoSchemas";

interface FederacaoRoutesOptions {
  federacaoService: FederacaoService;
}

export const federacaoRoutes: FastifyPluginAsync<
  FederacaoRoutesOptions
> = async (app, { federacaoService }) => {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/federacoes",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Federações"],
        summary: "Lista federações (paginado, busca parcial)",
        description:
          "`q` busca em nome e sigla (sem acento e sem diferenciar maiúsculas); `estado` filtra pela UF (2 letras). Ordenado por nome.",
        security: [{ bearerAuth: [] }],
        querystring: listarFederacoesQuerySchema,
        response: {
          200: paginatedResponseSchema(federacaoSchema),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request) => federacaoService.listar(request.query),
  );
};
