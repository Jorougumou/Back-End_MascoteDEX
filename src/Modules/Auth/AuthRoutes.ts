import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "@/Shared/Plugins/AuthPlugin";
import { ErrorResponseSchema } from "@/Shared/Schemas/Common";
import type { AuthService } from "./AuthService";
import {
  loginBodySchema,
  loginResponseSchema,
  registerBodySchema,
  usuarioPublicoSchema,
} from "./AuthSchemas";

interface AuthRoutesOptions {
  authService: AuthService;
  authRateLimitMax: number;
}

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  app,
  { authService, authRateLimitMax },
) => {
  // RN016: limite estrito nas rotas públicas de auth (D-25)
  const rateLimit = { max: authRateLimitMax, timeWindow: "1 minute" };

  app.withTypeProvider<ZodTypeProvider>().post(
    "/auth/register",
    {
      config: { rateLimit },
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

  app.withTypeProvider<ZodTypeProvider>().post(
    "/auth/login",
    {
      config: { rateLimit },
      schema: {
        tags: ["Auth"],
        summary: "Autentica e devolve o token JWT",
        description:
          "Devolve um JWT (validade configurada em JWT_EXPIRES_IN) para o header `Authorization: Bearer <token>`. Em falha, a mensagem é genérica e não revela qual campo estava errado.",
        body: loginBodySchema,
        response: {
          200: loginResponseSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          429: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const usuario = await authService.login(request.body);
      const token = app.jwt.sign({ sub: usuario.id, perfil: usuario.perfil });
      return reply.status(200).send({ token, usuario });
    },
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    "/auth/me",
    {
      preHandler: authenticate,
      schema: {
        tags: ["Auth"],
        summary: "Dados do usuário logado",
        security: [{ bearerAuth: [] }],
        response: {
          200: usuarioPublicoSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request) => authService.obterPorId(request.user.sub),
  );
};
