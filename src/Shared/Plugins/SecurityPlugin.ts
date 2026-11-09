import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { env } from "@/Config/Env";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";

interface SecurityOptions {
  rateLimitMax: number;
}

export function registerSecurity(
  app: FastifyInstance,
  options: SecurityOptions,
) {
  app.register(helmet, {
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
  });

  app.register(cors, {
    origin: env.CORS_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });

  app.register(rateLimit, {
    global: true,
    max: options.rateLimitMax,
    timeWindow: "1 minute",
    allowList: (request) => request.url.split("?")[0] === "/health",
    errorResponseBuilder: (_request, context) =>
      new AppError(
        ErrorCodes.RATE_LIMIT,
        429,
        `Muitas requisições. Tente novamente em ${context.after}.`,
      ),
  });
}
