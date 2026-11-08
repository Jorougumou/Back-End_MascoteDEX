import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { env } from "@/Config/Env";
import { authRoutes } from "@/Modules/Auth/AuthRoutes";
import { healthRoutes } from "@/Modules/Health/HealthRoutes";
import { mascoteRoutes } from "@/Modules/Mascotes/MascoteRoutes";
import { errorHandler, notFoundHandler } from "@/Shared/Errors/ErrorHandler";
import { buildContainer } from "@/Shared/Container";
import { registerAuth } from "@/Shared/Plugins/AuthPlugin";
import { registerSecurity } from "@/Shared/Plugins/SecurityPlugin";
import { registerSwagger } from "@/Shared/Plugins/SwaggerPlugin";
import { registerMultipart } from "./Shared/Plugins/MultipartPlugin";
import { eventoRoutes } from "./Modules/Eventos/EventoRoutes";
import { federacaoRoutes } from "./Modules/Federacoes/FederacaoRoutes";
import { empresaJuniorRoutes } from "./Modules/EmpresasJuniores/EmpresaJuniorRoutes";

const DEFAULT_RATE_LIMIT_MAX = 100;

// Será estendido com { storage } para injetar um StorageProvider falso nos testes.
export interface AppOverrides {
  rateLimitMax?: number;
  authRateLimitMax?: number;
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
  registerMultipart(app);
  registerAuth(app, {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  });

  const container = buildContainer();

  app.register(healthRoutes);
  app.register(authRoutes, {
    authService: container.authService,
    authRateLimitMax: overrides.authRateLimitMax ?? env.RATE_LIMIT_AUTH_MAX,
  });

  app.register(mascoteRoutes, { mascoteService: container.mascoteService });
  app.register(eventoRoutes, { eventoService: container.eventoService });

  app.register(federacaoRoutes, {
    federacaoService: container.federacaoService,
  });
  app.register(empresaJuniorRoutes, {
    empresaJuniorService: container.empresaJuniorService,
  });

  return app;
}

export type App = ReturnType<typeof buildApp>;
