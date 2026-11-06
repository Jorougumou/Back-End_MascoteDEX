import { prisma } from "@/Infra/Database/Prisma";
import { createAuthRepository } from "@/Modules/Auth/AuthRepository";
import { createAuthService } from "@/Modules/Auth/AuthService";
import { createMascoteRepository } from "@/Modules/Mascotes/MascoteRepository";
import { createMascoteService } from "@/Modules/Mascotes/MascoteService";

export function buildContainer() {
  const authRepository = createAuthRepository(prisma);
  const authService = createAuthService({ authRepository });

  const mascoteRepository = createMascoteRepository(prisma);
  const mascoteService = createMascoteService({ mascoteRepository });

  return { authService, mascoteService };
}

export type Container = ReturnType<typeof buildContainer>;
