import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate, requireRole } from "@/Shared/Plugins/AuthPlugin";
import {
  ErrorResponseSchema,
  paginatedResponseSchema,
  paginationQuerySchema,
} from "@/Shared/Schemas/Common";
import type { EventoService } from "./EventoService";
import { criarEventoBodySchema, eventoSchema } from "./EventoSchemas";

interface EventoRoutesOptions {
  eventoService: EventoService;
}

export const eventoRoutes: FastifyPluginAsync<EventoRoutesOptions> = async (
  app,
  { eventoService },
) => {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/eventos",
    {
      preHandler: [authenticate, requireRole("DIREX")],
      schema: {
        tags: ["Eventos"],
        summary: "Cria um evento (somente DIREX)",
        description:
          "Datas no formato `YYYY-MM-DD`; `dataFim` não pode ser anterior a `dataInicio` (RN011).",
        security: [{ bearerAuth: [] }],
        body: criarEventoBodySchema,
        response: {
          201: eventoSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const evento = await eventoService.criar(request.body, request.user.sub);
      return reply.status(201).send(evento);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    "/eventos",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Eventos"],
        summary: "Lista eventos (paginado, mais recentes primeiro)",
        security: [{ bearerAuth: [] }],
        querystring: paginationQuerySchema,
        response: {
          200: paginatedResponseSchema(eventoSchema),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request) => eventoService.listar(request.query),
  );
};
