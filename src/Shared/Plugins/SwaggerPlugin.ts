import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

const API_VERSION = "1.0.0";

export function registerSwagger(app: FastifyInstance) {
  app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "MascotDex API",
        description:
          "API do MascotDex: catálogo e coleção de mascotes de Empresas Juniores da Include Jr.",
        version: API_VERSION,
      },
      tags: [
        { name: "Health", description: "Verificação de disponibilidade" },
        { name: "Auth", description: "Cadastro e login" },
        {
          name: "Eventos",
          description: "Eventos do MEJ (criação restrita à Direx)",
        },
        { name: "Federações", description: "Consulta de federações" },
        { name: "Empresas Juniores", description: "Consulta de EJs" },
        { name: "Mascotes", description: "Cadastro, galeria e perfil" },
        { name: "Capturas", description: "Registro de capturas" },
        { name: "Ranking", description: "Ranking de membros" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  app.register(swaggerUi, { routePrefix: "/docs" });
}
