import { describe, expect, it } from "vitest";
import type {
  AuthRepository,
  UsuarioComSenha,
} from "@/Modules/Auth/AuthRepository";
import { registerBodySchema } from "@/Modules/Auth/AuthSchemas";
import { createAuthService } from "@/Modules/Auth/AuthService";
import { AppError } from "@/Shared/Errors/AppError";
import { verifyPassword } from "@/Shared/Utils/Password";

function criarRepositorioFalso() {
  const usuarios: UsuarioComSenha[] = [];

  const publico = ({ senhaHash: _senhaHash, ...resto }: UsuarioComSenha) =>
    resto;

  const repository: AuthRepository = {
    async existePorEmail(email) {
      return usuarios.some((usuario) => usuario.email === email);
    },
    async buscarPorEmail(email) {
      return usuarios.find((usuario) => usuario.email === email) ?? null;
    },
    async buscarPorId(id) {
      const usuario = usuarios.find((item) => item.id === id);
      return usuario ? publico(usuario) : null;
    },
    async criar(dados) {
      const usuario: UsuarioComSenha = {
        id: crypto.randomUUID(),
        perfil: "MEMBRO",
        ...dados,
      };
      usuarios.push(usuario);
      return publico(usuario);
    },
  };

  return { repository, usuarios };
}

const dadosAna = {
  nome: "Ana",
  email: "ana@email.com",
  senha: "senha-segura-123",
};

describe("RF001 / RN002 — cadastro de membro", () => {
  it("cria o usuário como MEMBRO, guarda hash argon2 e não devolve a senha", async () => {
    const { repository, usuarios } = criarRepositorioFalso();
    const service = createAuthService({ authRepository: repository });

    const resultado = await service.registrar(dadosAna);

    expect(resultado.perfil).toBe("MEMBRO");
    expect(resultado).not.toHaveProperty("senhaHash");
    expect(usuarios[0]?.senhaHash).not.toBe(dadosAna.senha);
    expect(
      await verifyPassword(usuarios[0]?.senhaHash ?? "", dadosAna.senha),
    ).toBe(true);
  });
});

describe("RN003 — e-mail único", () => {
  it("lança EMAIL_JA_CADASTRADO (409) e não cria o segundo usuário", async () => {
    const { repository, usuarios } = criarRepositorioFalso();
    const service = createAuthService({ authRepository: repository });

    await service.registrar(dadosAna);
    const erro = await service.registrar(dadosAna).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(AppError);
    expect(erro).toMatchObject({
      code: "EMAIL_JA_CADASTRADO",
      statusCode: 409,
    });
    expect(usuarios).toHaveLength(1);
  });
});

describe("RF002 / RN016 — login", () => {
  it("devolve o usuário público quando e-mail e senha conferem", async () => {
    const { repository } = criarRepositorioFalso();
    const service = createAuthService({ authRepository: repository });
    const criado = await service.registrar(dadosAna);

    const usuario = await service.login({
      email: dadosAna.email,
      senha: dadosAna.senha,
    });

    expect(usuario).toEqual(criado);
    expect(usuario).not.toHaveProperty("senhaHash");
  });

  it("usa a MESMA mensagem para senha errada e e-mail inexistente (RN016)", async () => {
    const { repository } = criarRepositorioFalso();
    const service = createAuthService({ authRepository: repository });
    await service.registrar(dadosAna);

    const senhaErrada = await service
      .login({ email: dadosAna.email, senha: "outra-senha" })
      .catch((e: unknown) => e);
    const emailInexistente = await service
      .login({ email: "ninguem@email.com", senha: dadosAna.senha })
      .catch((e: unknown) => e);

    for (const erro of [senhaErrada, emailInexistente]) {
      expect(erro).toBeInstanceOf(AppError);
      expect(erro).toMatchObject({
        code: "CREDENCIAIS_INVALIDAS",
        statusCode: 401,
        message: "E-mail ou senha inválidos.",
      });
    }
  });
});

describe("RF002 — usuário logado (/auth/me)", () => {
  it("devolve o usuário pelo id do token", async () => {
    const { repository } = criarRepositorioFalso();
    const service = createAuthService({ authRepository: repository });
    const criado = await service.registrar(dadosAna);

    expect(await service.obterPorId(criado.id)).toEqual(criado);
  });

  it("lança NAO_AUTENTICADO (401) se o usuário do token não existe mais", async () => {
    const { repository } = criarRepositorioFalso();
    const service = createAuthService({ authRepository: repository });

    const erro = await service
      .obterPorId(crypto.randomUUID())
      .catch((e: unknown) => e);

    expect(erro).toMatchObject({ code: "NAO_AUTENTICADO", statusCode: 401 });
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
    const base = { ...dadosAna };

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
