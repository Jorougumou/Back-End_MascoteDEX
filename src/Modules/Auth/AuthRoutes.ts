import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { ErrorResponseSchema } from "@/Shared/Schemas/Common";
import type { AuthService } from "./AuthService";
import { registerBodySchema, usuarioPublicoSchema } from "./AuthSchemas";

interface AuthRoutesOptions {
  authService: AuthService;
}

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  app,
  { authService },
) => {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/auth/register",
    {
      schema: {
        tags: ["Auth"],
        summary: "Cria uma conta de membro",
        description:
          "Cria um usuário sempre com perfil MEMBRO (RN002). O e-mail é normalizado (trim + minúsculas) e deve ser único (RN003).",
        body: registerBodySchema,
        response: {
          201: usuarioPublicoSchema,
          400: ErrorResponseSchema,
          409: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const usuario = await authService.registrar(request.body);
      return reply.status(201).send(usuario);
    },
  );
};
