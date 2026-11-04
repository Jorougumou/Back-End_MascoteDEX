import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import { hashPassword } from "@/Shared/Utils/Password";
import type { AuthRepository } from "./AuthRepository";
import type { RegisterBody, UsuarioPublico } from "./AuthSchemas";

interface AuthServiceDeps {
  authRepository: AuthRepository;
}

export function createAuthService({ authRepository }: AuthServiceDeps) {
  return {
    async registrar(dados: RegisterBody): Promise<UsuarioPublico> {
      if (await authRepository.existePorEmail(dados.email)) {
        throw new AppError(
          ErrorCodes.EMAIL_JA_CADASTRADO,
          409,
          "Este e-mail já está cadastrado.",
        );
      }

      return authRepository.criar({
        nome: dados.nome,
        email: dados.email,
        senhaHash: await hashPassword(dados.senha),
      });
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
