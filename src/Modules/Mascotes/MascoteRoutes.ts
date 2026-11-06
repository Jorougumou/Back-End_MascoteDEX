import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "@/Shared/Plugins/AuthPlugin";
import {
  ErrorResponseSchema,
  paginationQuerySchema,
} from "@/Shared/Schemas/Common";
import { galeriaResponseSchema } from "./MascoteSchemas";
import type { MascoteService } from "./MascoteService";

interface MascoteRoutesOptions {
  mascoteService: MascoteService;
}

export const mascoteRoutes: FastifyPluginAsync<MascoteRoutesOptions> = async (
  app,
  { mascoteService },
) => {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/mascotes",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Mascotes"],
        summary: "Galeria paginada de mascotes",
        description:
          "Lista os mascotes catalogados (foto, nome, EJ e federação), mais recentes primeiro. O campo `capturado` indica se o usuário logado já capturou o mascote. Sem mascotes, devolve `data: []` e `total: 0`.",
        security: [{ bearerAuth: [] }],
        querystring: paginationQuerySchema,
        response: {
          200: galeriaResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const { page, limit } = request.query;
      return mascoteService.listarGaleria(request.user.sub, page, limit);
    },
  );
};