import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "@/Shared/Plugins/AuthPlugin";
import { ErrorResponseSchema } from "@/Shared/Schemas/Common";
import { galeriaQuerySchema, galeriaResponseSchema } from "./MascoteSchemas";
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
};