import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "@/Shared/Plugins/AuthPlugin";
import { ErrorResponseSchema } from "@/Shared/Schemas/Common";
import type { EmpresaJuniorService } from "./EmpresaJunioresService";
import {
  empresaJunioresSchema,
  getEmpresaJunioresParamsSchema,
  listarEmpresasJunioresQuerySchema,
  listarEmpresasJunioresResponseSchema,
} from "./EmpresaJunioresSchemas";

interface EmpresaJuniorRoutesOptions {
  empresaJuniorService: EmpresaJuniorService;
}

export const empresaJuniorRoutes: FastifyPluginAsync<
  EmpresaJuniorRoutesOptions
> = async (app, { empresaJuniorService }) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get(
    "/empresas-juniores",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Empresas Juniores"],
        summary: "Listar Empresas Juniores",
        description:
          "Retorna uma lista paginada de Empresas Juniores com suporte a busca parcial por nome ou universidade.",
        security: [{ bearerAuth: [] }],
        querystring: listarEmpresasJunioresQuerySchema,
        response: {
          200: listarEmpresasJunioresResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const resultado = await empresaJuniorService.listar(request.query);
      return reply.status(200).send(resultado);
    },
  );

  typedApp.get(
    "/empresas-juniores/:id",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Empresas Juniores"],
        summary: "Buscar Empresa Júnior por ID",
        description:
          "Retorna os dados cadastrais de uma Empresa Júnior específica pelo seu ID.",
        security: [{ bearerAuth: [] }],
        params: getEmpresaJunioresParamsSchema,
        response: {
          200: empresaJunioresSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const empresaJunior = await empresaJuniorService.obterPorId(id);
      return reply.status(200).send(empresaJunior);
    },
  );
};