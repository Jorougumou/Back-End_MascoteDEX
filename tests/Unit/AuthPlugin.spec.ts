import Fastify from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { errorHandler } from "@/Shared/Errors/ErrorHandler";
import {
  authenticate,
  registerAuth,
  requireRole,
  type TokenPayload,
} from "@/Shared/Plugins/AuthPlugin";

function buildAppDeTeste() {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  registerAuth(app, {
    secret: "segredo-de-teste-com-pelo-menos-32-caracteres",
    expiresIn: "1h",
  });

  app.get("/privada", { preHandler: authenticate }, async (request) => ({
    sub: request.user.sub,
  }));
  app.get(
    "/direx",
    { preHandler: [authenticate, requireRole("DIREX")] },
    async () => ({ ok: true }),
  );

  return app;
}

describe("RN001 / RN002 — authenticate e requireRole", () => {
  const app = buildAppDeTeste();
  const id = "11111111-1111-4111-8111-111111111111";

  beforeAll(() => app.ready());
  afterAll(() => app.close());

  const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

  it("401 NAO_AUTENTICADO sem token", async () => {
    const response = await app.inject({ method: "GET", url: "/privada" });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe("NAO_AUTENTICADO");
  });

  it("401 com token inválido", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/privada",
      headers: bearer("token-invalido"),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe("NAO_AUTENTICADO");
  });

  it("401 com token expirado", async () => {
    // `iat` de 1h atrás + validade de 60s => token já expirado
    const emitidoHaUmaHora = Math.floor(Date.now() / 1000) - 3600;
    const expirado = app.jwt.sign(
      { sub: id, perfil: "MEMBRO", iat: emitidoHaUmaHora } as TokenPayload,
      { expiresIn: 60 },
    );

    const response = await app.inject({
      method: "GET",
      url: "/privada",
      headers: bearer(expirado),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe("NAO_AUTENTICADO");
  });

  it("200 com token válido, expondo o id em request.user.sub", async () => {
    const token = app.jwt.sign({ sub: id, perfil: "MEMBRO" });

    const response = await app.inject({
      method: "GET",
      url: "/privada",
      headers: bearer(token),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ sub: id });
  });

  it("403 SEM_PERMISSAO para MEMBRO em rota de DIREX", async () => {
    const token = app.jwt.sign({ sub: id, perfil: "MEMBRO" });

    const response = await app.inject({
      method: "GET",
      url: "/direx",
      headers: bearer(token),
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe("SEM_PERMISSAO");
  });

  it("200 para DIREX em rota de DIREX", async () => {
    const token = app.jwt.sign({ sub: id, perfil: "DIREX" });

    const response = await app.inject({
      method: "GET",
      url: "/direx",
      headers: bearer(token),
    });

    expect(response.statusCode).toBe(200);
  });
});
