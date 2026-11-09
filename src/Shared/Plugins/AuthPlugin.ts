import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";

export type PerfilUsuario = "MEMBRO" | "DIREX";

export interface TokenPayload {
  sub: string;
  perfil: PerfilUsuario;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: TokenPayload;
    user: TokenPayload;
  }
}

interface AuthPluginOptions {
  secret: string;
  expiresIn: string;
}

export function registerAuth(app: FastifyInstance, options: AuthPluginOptions) {
  app.register(fastifyJwt, {
    secret: options.secret,
    sign: { expiresIn: options.expiresIn },
  });
}

export async function authenticate(request: FastifyRequest) {
  try {
    await request.jwtVerify();
  } catch {
    throw new AppError(
      ErrorCodes.NAO_AUTENTICADO,
      401,
      "Token ausente, inválido ou expirado.",
    );
  }
}

export function requireRole(...perfis: PerfilUsuario[]) {
  return async (request: FastifyRequest) => {
    if (!perfis.includes(request.user.perfil)) {
      throw new AppError(
        ErrorCodes.SEM_PERMISSAO,
        403,
        "Você não tem permissão para realizar esta ação.",
      );
    }
  };
}
