import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "@/Shared/Plugins/AuthPlugin";
import {
  ErrorResponseSchema,
  paginatedResponseSchema,
} from "@/Shared/Schemas/Common";
import type { EmpresaJuniorService } from "./EmpresaJuniorService";
import {
  empresaJuniorSchema,
  listarEmpresasJunioresQuerySchema,
} from "./EmpresaJuniorSchemas";

interface EmpresaJuniorRoutesOptions {
  empresaJuniorService: EmpresaJuniorService;
}

export const empresaJuniorRoutes: FastifyPluginAsync<
  EmpresaJuniorRoutesOptions
> = async (app, { empresaJuniorService }) => {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/empresas-juniores",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Empresas Juniores"],
        summary: "Lista empresas juniores (paginado, busca parcial)",
        description:
          "`q` busca no nome (sem acento e sem diferenciar maiúsculas) e na universidade; `federacaoId` filtra por federação. Ordenado por nome.",
        security: [{ bearerAuth: [] }],
        querystring: listarEmpresasJunioresQuerySchema,
        response: {
          200: paginatedResponseSchema(empresaJuniorSchema),
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request) => empresaJuniorService.listar(request.query),
  );
};
