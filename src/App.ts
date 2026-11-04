import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { env } from "@/Config/Env";
import { healthRoutes } from "@/Modules/Health/HealthRoutes";
import { errorHandler, notFoundHandler } from "@/Shared/Errors/ErrorHandler";

// Será estendido com { storage } na T-14, para injetar um StorageProvider falso nos testes.
export type AppOverrides = Record<string, never>;

export function buildApp(_overrides: AppOverrides = {}) {
  const app = Fastify({
    trustProxy: true,
    logger: {
      level: env.LOG_LEVEL,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "*.senha",
          "*.password",
          "*.senhaHash",
          "*.token",
          "*.SUPABASE_SERVICE_ROLE_KEY",
        ],
        censor: "[REDACTED]",
      },
    },
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  app.register(healthRoutes);

  return app;
}

export type App = ReturnType<typeof buildApp>;
