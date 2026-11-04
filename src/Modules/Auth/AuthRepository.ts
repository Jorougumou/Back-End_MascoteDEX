import { Prisma, type PrismaClient } from "@prisma/client";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import type { UsuarioPublico } from "./AuthSchemas";

export interface NovoUsuario {
  nome: string;
  email: string;
  senhaHash: string;
}

export interface AuthRepository {
  existePorEmail(email: string): Promise<boolean>;
  criar(dados: NovoUsuario): Promise<UsuarioPublico>;
}

export function createAuthRepository(prisma: PrismaClient): AuthRepository {
  return {
    async existePorEmail(email) {
      const total = await prisma.usuario.count({ where: { email } });
      return total > 0;
    },

    async criar(dados) {
      try {
        return await prisma.usuario.create({
          data: { ...dados, perfil: "MEMBRO" },
          select: { id: true, nome: true, email: true, perfil: true },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new AppError(
            ErrorCodes.EMAIL_JA_CADASTRADO,
            409,
            "Este e-mail já está cadastrado.",
          );
        }
        throw error;
      }
    },
  };
}
