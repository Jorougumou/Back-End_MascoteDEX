import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/Infra/Database/Prisma";
import type { TokenPayload } from "@/Shared/Plugins/AuthPlugin";
import {
  setupIntegration,
  teardownIntegration,
} from "../Helpers/SetupIntegration";

type TestApp = Awaited<ReturnType<typeof setupIntegration>>;

const ana = {
  nome: "Ana",
  email: "ana@email.com",
  senha: "senha-segura-123",
};

function registrar(app: TestApp, payload: object = ana) {
  return app.inject({ method: "POST", url: "/auth/register", payload });
}

function login(app: TestApp, payload: object) {
  return app.inject({ method: "POST", url: "/auth/login", payload });
}

async function obterToken(app: TestApp): Promise<string> {
  await registrar(app);
  const response = await login(app, {
    email: ana.email,
    senha: ana.senha,
  });
  return response.json().token as string;
}

describe("Auth (integração)", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await setupIntegration({
      rateLimitMax: 1000,
      authRateLimitMax: 1000,
    });
  });

  afterAll(teardownIntegration);

  describe("POST /auth/register — RF001, RN002, RN003", () => {
    it("cria o usuário como MEMBRO e não devolve senha nem hash", async () => {
      const response = await registrar(app);
      const body = response.json();

      expect(response.statusCode).toBe(201);
      expect(body).toEqual({
        id: expect.any(String),
        nome: "Ana",
        email: "ana@email.com",
        perfil: "MEMBRO",
      });
      expect(response.body).not.toMatch(/senha|hash/i);
    });

    it("grava a senha como hash argon2id no banco", async () => {
      await registrar(app);

      const usuario = await prisma.usuario.findUniqueOrThrow({
        where: { email: ana.email },
      });

      expect(usuario.senhaHash).not.toBe(ana.senha);
      expect(usuario.senhaHash.startsWith("$argon2id$")).toBe(true);
    });

    it("RN002: ignora `perfil: DIREX` enviado no body", async () => {
      const response = await registrar(app, { ...ana, perfil: "DIREX" });

      const usuario = await prisma.usuario.findUniqueOrThrow({
        where: { email: ana.email },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().perfil).toBe("MEMBRO");
      expect(usuario.perfil).toBe("MEMBRO");
    });

    it("normaliza o e-mail (trim + minúsculas)", async () => {
      const response = await registrar(app, {
        ...ana,
        email: "  ANA@Email.COM ",
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().email).toBe("ana@email.com");
    });

    it("RN003: e-mail duplicado (mesmo com outra caixa) → 409 EMAIL_JA_CADASTRADO", async () => {
      await registrar(app);

      const response = await registrar(app, {
        ...ana,
        email: "ANA@email.com",
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().code).toBe("EMAIL_JA_CADASTRADO");
      expect(await prisma.usuario.count()).toBe(1);
    });

    it("RN003/D-08: duas requisições simultâneas com o mesmo e-mail → um 201 e um 409", async () => {
      const respostas = await Promise.all([registrar(app), registrar(app)]);
      const status = respostas.map((r) => r.statusCode).sort();

      expect(status).toEqual([201, 409]);
      expect(await prisma.usuario.count()).toBe(1);
    });

    it("dados inválidos → 400 VALIDATION_ERROR com um item em `details` por campo inválido", async () => {
      const response = await registrar(app, {
        nome: "A",
        email: "nao-e-email",
        senha: "123",
      });
      const body = response.json();

      expect(response.statusCode).toBe(400);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(Array.isArray(body.details)).toBe(true);
      expect(body.details.length).toBeGreaterThanOrEqual(3);
      expect(await prisma.usuario.count()).toBe(0);
    });
  });

  describe("POST /auth/login — RF002, RN016", () => {
    it("200 com token JWT e usuário público", async () => {
      await registrar(app);

      const response = await login(app, {
        email: ana.email,
        senha: ana.senha,
      });
      const body = response.json();
      const payload = app.jwt.verify<TokenPayload>(body.token);

      expect(response.statusCode).toBe(200);
      expect(body.usuario).toMatchObject({
        nome: "Ana",
        email: "ana@email.com",
        perfil: "MEMBRO",
      });
      expect(payload.sub).toBe(body.usuario.id);
      expect(payload.perfil).toBe("MEMBRO");
      expect(response.body).not.toMatch(/hash/i);
    });

    it("aceita o e-mail com outra caixa e espaços", async () => {
      await registrar(app);

      const response = await login(app, {
        email: "  ANA@email.com ",
        senha: ana.senha,
      });

      expect(response.statusCode).toBe(200);
    });

    it("RN016: senha errada e e-mail inexistente dão a MESMA resposta 401", async () => {
      await registrar(app);

      const senhaErrada = await login(app, {
        email: ana.email,
        senha: "senha-errada-123",
      });
      const emailInexistente = await login(app, {
        email: "ninguem@email.com",
        senha: ana.senha,
      });

      expect(senhaErrada.statusCode).toBe(401);
      expect(emailInexistente.statusCode).toBe(401);
      expect(senhaErrada.json()).toEqual(emailInexistente.json());
      expect(senhaErrada.json().code).toBe("CREDENCIAIS_INVALIDAS");
    });

    it("body incompleto → 400 VALIDATION_ERROR", async () => {
      const response = await login(app, { email: ana.email });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /auth/me — RF002, RN001", () => {
    it("200 com o usuário do token", async () => {
      const token = await obterToken(app);

      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        nome: "Ana",
        email: "ana@email.com",
        perfil: "MEMBRO",
      });
      expect(response.body).not.toMatch(/hash/i);
    });

    it("401 NAO_AUTENTICADO sem token", async () => {
      const response = await app.inject({ method: "GET", url: "/auth/me" });

      expect(response.statusCode).toBe(401);
      expect(response.json().code).toBe("NAO_AUTENTICADO");
    });

    it("401 com token inválido", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { authorization: "Bearer token-invalido" },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().code).toBe("NAO_AUTENTICADO");
    });

    it("401 se o usuário do token não existe mais (D-30)", async () => {
      const token = await obterToken(app);
      await prisma.usuario.deleteMany();

      const response = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().code).toBe("NAO_AUTENTICADO");
    });
  });
});

describe("Rate limit estrito de auth — RN016, D-25", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await setupIntegration({ rateLimitMax: 1000, authRateLimitMax: 2 });
  });

  afterAll(teardownIntegration);

  it("/auth/login: a 3ª tentativa no minuto responde 429 RATE_LIMIT", async () => {
    const tentativa = () =>
      login(app, { email: ana.email, senha: "senha-errada-123" });

    const status = [
      (await tentativa()).statusCode,
      (await tentativa()).statusCode,
    ];
    const bloqueada = await tentativa();

    expect(status).toEqual([401, 401]);
    expect(bloqueada.statusCode).toBe(429);
    expect(bloqueada.json().code).toBe("RATE_LIMIT");
  });

  it("/auth/register tem contador próprio (não é bloqueado pelo login)", async () => {
    const primeira = await registrar(app, {
      ...ana,
      email: "bia@email.com",
    });

    expect(primeira.statusCode).toBe(201);
  });
});
