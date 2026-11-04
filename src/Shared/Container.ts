import { prisma } from "@/Infra/Database/Prisma";
import { createAuthRepository } from "@/Modules/Auth/AuthRepository";
import { createAuthService } from "@/Modules/Auth/AuthService";

export function buildContainer() {
  const authRepository = createAuthRepository(prisma);
  const authService = createAuthService({ authRepository });

  return { authService };
}

export type Container = ReturnType<typeof buildContainer>;
