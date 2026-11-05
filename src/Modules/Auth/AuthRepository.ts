import { Prisma, type PrismaClient } from "@prisma/client";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import type { UsuarioPublico } from "./AuthSchemas";

export interface NovoUsuario {
  nome: string;
  email: string;
  senhaHash: string;
}

export interface UsuarioComSenha extends UsuarioPublico {
  senhaHash: string;
}

export interface AuthRepository {
  existePorEmail(email: string): Promise<boolean>;
  buscarPorEmail(email: string): Promise<UsuarioComSenha | null>;
  buscarPorId(id: string): Promise<UsuarioPublico | null>;
  criar(dados: NovoUsuario): Promise<UsuarioPublico>;
}

const selectPublico = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
} as const;

export function createAuthRepository(prisma: PrismaClient): AuthRepository {
  return {
    async existePorEmail(email) {
      const total = await prisma.usuario.count({ where: { email } });
      return total > 0;
    },

    buscarPorEmail(email) {
      return prisma.usuario.findUnique({
        where: { email },
        select: { ...selectPublico, senhaHash: true },
      });
    },

    buscarPorId(id) {
      return prisma.usuario.findUnique({
        where: { id },
        select: selectPublico,
      });
    },

    async criar(dados) {
      try {
        return await prisma.usuario.create({
          data: { ...dados, perfil: "MEMBRO" },
          select: selectPublico,
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
