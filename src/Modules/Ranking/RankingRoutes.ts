import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "@/Shared/Plugins/AuthPlugin";
import { ErrorResponseSchema } from "@/Shared/Schemas/Common";
import type { RankingService } from "./RankingService";
import { rankingQuerySchema, rankingResponseSchema } from "./RankingSchemas";

interface RankingRoutesOptions {
  rankingService: RankingService;
}

export const rankingRoutes: FastifyPluginAsync<RankingRoutesOptions> = async (
  app,
  { rankingService },
) => {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/ranking",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Ranking"],
        summary: "Ranking geral ou por evento (paginado)",
        description:
          "Total = mascotes **distintos** capturados pelo usuário (RN012). Ordem: total decrescente; desempate pela última captura mais antiga. `me` traz a posição do usuário logado, independente da página (ou `null` se ele não tem capturas no escopo).",
        security: [{ bearerAuth: [] }],
        querystring: rankingQuerySchema,
        response: {
          200: rankingResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request) =>
      rankingService.listar({
        usuarioLogadoId: request.user.sub,
        eventoId: request.query.eventoId,
        page: request.query.page,
        limit: request.query.limit,
      }),
  );
};
