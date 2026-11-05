import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import { hashPassword, verifyPassword } from "@/Shared/Utils/Password";
import type { AuthRepository } from "./AuthRepository";
import type { LoginBody, RegisterBody, UsuarioPublico } from "./AuthSchemas";

interface AuthServiceDeps {
  authRepository: AuthRepository;
}
let hashFalso: Promise<string> | undefined;
function obterHashFalso() {
  hashFalso ??= hashPassword("senha-que-nunca-sera-usada");
  return hashFalso;
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

    // RF002, RN016: mensagem genérica, sem revelar qual campo falhou
    async login(dados: LoginBody): Promise<UsuarioPublico> {
      const usuario = await authRepository.buscarPorEmail(dados.email);
      const senhaConfere = await verifyPassword(
        usuario?.senhaHash ?? (await obterHashFalso()),
        dados.senha,
      );

      if (!usuario || !senhaConfere) {
        throw new AppError(
          ErrorCodes.CREDENCIAIS_INVALIDAS,
          401,
          "E-mail ou senha inválidos.",
        );
      }

      return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      };
    },

    async obterPorId(id: string): Promise<UsuarioPublico> {
      const usuario = await authRepository.buscarPorId(id);

      if (!usuario) {
        throw new AppError(
          ErrorCodes.NAO_AUTENTICADO,
          401,
          "Usuário do token não encontrado.",
        );
      }

      return usuario;
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
