import { prisma } from "@/Infra/Database/Prisma";
import { createAuthRepository } from "@/Modules/Auth/AuthRepository";
import { createAuthService } from "@/Modules/Auth/AuthService";
import { createEventoRepository } from "@/Modules/Eventos/EventoRepository";
import { createEventoService } from "@/Modules/Eventos/EventoService";

export function buildContainer() {
  const authRepository = createAuthRepository(prisma);
  const authService = createAuthService({ authRepository });

  const eventoRepository = createEventoRepository(prisma);
  const eventoService = createEventoService({ eventoRepository });

  return { authService, eventoService };
}

export type Container = ReturnType<typeof buildContainer>;
