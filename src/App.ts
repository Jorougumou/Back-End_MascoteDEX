import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { env } from "@/Config/Env";
import { healthRoutes } from "@/Modules/Health/HealthRoutes";
import { errorHandler, notFoundHandler } from "@/Shared/Errors/ErrorHandler";
import { registerSecurity } from "@/Shared/Plugins/SecurityPlugin";
import { registerSwagger } from "@/Shared/Plugins/SwaggerPlugin";

const DEFAULT_RATE_LIMIT_MAX = 100;

// Será estendido com { storage } para injetar um StorageProvider falso nos testes.
export interface AppOverrides {
  rateLimitMax?: number;
}

export function buildApp(overrides: AppOverrides = {}) {
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

  registerSecurity(app, {
    rateLimitMax: overrides.rateLimitMax ?? DEFAULT_RATE_LIMIT_MAX,
  });
  registerSwagger(app);

  app.register(healthRoutes);

  return app;
}

export type App = ReturnType<typeof buildApp>;
