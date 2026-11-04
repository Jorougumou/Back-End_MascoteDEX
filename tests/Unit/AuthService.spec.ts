import { describe, expect, it } from "vitest";
import type { AuthRepository } from "@/Modules/Auth/AuthRepository";
import {
  registerBodySchema,
  type UsuarioPublico,
} from "@/Modules/Auth/AuthSchemas";
import { createAuthService } from "@/Modules/Auth/AuthService";
import { AppError } from "@/Shared/Errors/AppError";
import { verifyPassword } from "@/Shared/Utils/Password";

function criarRepositorioFalso() {
  const usuarios: Array<UsuarioPublico & { senhaHash: string }> = [];

  const repository: AuthRepository = {
    async existePorEmail(email) {
      return usuarios.some((usuario) => usuario.email === email);
    },
    async criar(dados) {
      const usuario = {
        id: crypto.randomUUID(),
        perfil: "MEMBRO" as const,
        ...dados,
      };
      usuarios.push(usuario);
      return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      };
    },
  };

  return { repository, usuarios };
}

describe("RF001 / RN002 — cadastro de membro", () => {
  it("cria o usuário como MEMBRO, guarda hash argon2 e não devolve a senha", async () => {
    const { repository, usuarios } = criarRepositorioFalso();
    const service = createAuthService({ authRepository: repository });

    const resultado = await service.registrar({
      nome: "Ana",
      email: "ana@email.com",
      senha: "senha-segura-123",
    });

    expect(resultado.perfil).toBe("MEMBRO");
    expect(resultado).not.toHaveProperty("senhaHash");
    expect(usuarios[0]?.senhaHash).not.toBe("senha-segura-123");
    expect(
      await verifyPassword(usuarios[0]?.senhaHash ?? "", "senha-segura-123"),
    ).toBe(true);
  });
});

describe("RN003 — e-mail único", () => {
  it("lança EMAIL_JA_CADASTRADO (409) e não cria o segundo usuário", async () => {
    const { repository, usuarios } = criarRepositorioFalso();
    const service = createAuthService({ authRepository: repository });
    const dados = {
      nome: "Ana",
      email: "ana@email.com",
      senha: "senha-segura-123",
    };

    await service.registrar(dados);
    const erro = await service.registrar(dados).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(AppError);
    expect(erro).toMatchObject({
      code: "EMAIL_JA_CADASTRADO",
      statusCode: 409,
    });
    expect(usuarios).toHaveLength(1);
  });
});

describe("D-21 / RN002 — schema do cadastro", () => {
  it("normaliza o e-mail (trim + minúsculas) e ignora `perfil` enviado no body", () => {
    const body = registerBodySchema.parse({
      nome: "  Ana  ",
      email: "  Ana@Email.COM ",
      senha: "senha-segura-123",
      perfil: "DIREX",
    });

    expect(body).toEqual({
      nome: "Ana",
      email: "ana@email.com",
      senha: "senha-segura-123",
    });
  });

  it("rejeita e-mail inválido, senha curta e nome com < ou >", () => {
    const base = {
      nome: "Ana",
      email: "ana@email.com",
      senha: "senha-segura-123",
    };

    expect(
      registerBodySchema.safeParse({ ...base, email: "ana" }).success,
    ).toBe(false);
    expect(
      registerBodySchema.safeParse({ ...base, senha: "1234567" }).success,
    ).toBe(false);
    expect(
      registerBodySchema.safeParse({ ...base, nome: "<b>Ana</b>" }).success,
    ).toBe(false);
  });
});
