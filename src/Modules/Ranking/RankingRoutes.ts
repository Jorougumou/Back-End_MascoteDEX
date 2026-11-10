import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "@/Shared/Plugins/AuthPlugin";
import { ErrorResponseSchema } from "@/Shared/Schemas/Common";
import type { RankingService } from "./RankingService";
import {
  getRankingQuerySchema,
  getRankingResponseSchema,
} from "./RankingSchemas";

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
        summary: "Exibe o ranking geral ou por evento",
        security: [{ bearerAuth: [] }],
        querystring: getRankingQuerySchema,
        response: {
          200: getRankingResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { eventoId } = request.query;
      const usuarioLogadoId = request.user.sub;

      const result = await rankingService.execute(usuarioLogadoId, eventoId);
      return reply.status(200).send(result);
    },
  );
};
