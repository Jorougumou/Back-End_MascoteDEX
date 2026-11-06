import { prisma } from "@/Infra/Database/Prisma";
import { createAuthRepository } from "@/Modules/Auth/AuthRepository";
import { createAuthService } from "@/Modules/Auth/AuthService";
import { createMascoteRepository } from "@/Modules/Mascotes/MascoteRepository";
import { createMascoteService } from "@/Modules/Mascotes/MascoteService";
import { createEventoRepository } from "@/Modules/Eventos/EventoRepository";
import { createEventoService } from "@/Modules/Eventos/EventoService";

export function buildContainer() {
  const authRepository = createAuthRepository(prisma);
  const authService = createAuthService({ authRepository });

  const mascoteRepository = createMascoteRepository(prisma);
  const mascoteService = createMascoteService({ mascoteRepository });

  const eventoRepository = createEventoRepository(prisma);
  const eventoService = createEventoService({ eventoRepository });

  return { authService, mascoteService, eventoService };
}

export type Container = ReturnType<typeof buildContainer>;
