import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export async function healthRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Verifica se a API está no ar",
        description: "Liveness: não consulta o banco de dados.",
        response: {
          200: z.object({
            status: z.literal("ok"),
            uptime: z.number(),
            timestamp: z.string(),
          }),
        },
      },
    },
    async () => ({
      status: "ok" as const,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  );
}
