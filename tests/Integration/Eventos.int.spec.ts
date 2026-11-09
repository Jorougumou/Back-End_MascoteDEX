import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/Infra/Database/Prisma";
import { criarUsuarioComToken } from "../Helpers/Factories";
import {
  setupIntegration,
  teardownIntegration,
} from "../Helpers/SetupIntegration";

type TestApp = Awaited<ReturnType<typeof setupIntegration>>;

const evento = {
  nome: "Congresso EJ",
  local: "Fortaleza",
  dataInicio: "2026-11-10",
  dataFim: "2026-11-12",
};

describe("Eventos (integração)", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await setupIntegration({
      rateLimitMax: 1000,
      authRateLimitMax: 1000,
    });
  });

  afterAll(teardownIntegration);

  const criar = (payload: object, headers?: Record<string, string>) =>
    app.inject({ method: "POST", url: "/eventos", payload, headers });

  describe("POST /eventos — RF008, RN011", () => {
    it("DIREX cria o evento (201) sem expor usuarioId", async () => {
      const direx = await criarUsuarioComToken(app, "DIREX");

      const response = await criar(evento, direx.headers);

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({
        id: expect.any(String),
        ...evento,
        criadoEm: expect.any(String),
      });
      expect(response.body).not.toMatch(/usuarioId/);

      const gravado = await prisma.evento.findFirstOrThrow();
      expect(gravado.usuarioId).toBe(direx.id);
    });

    it("D-31: MEMBRO recebe 403 SEM_PERMISSAO e nada é gravado", async () => {
      const membro = await criarUsuarioComToken(app, "MEMBRO");

      const response = await criar(evento, membro.headers);

      expect(response.statusCode).toBe(403);
      expect(response.json().code).toBe("SEM_PERMISSAO");
      expect(await prisma.evento.count()).toBe(0);
    });

    it("sem token ou com token inválido recebe 401 NAO_AUTENTICADO", async () => {
      const semToken = await criar(evento);
      const invalido = await criar(evento, { authorization: "Bearer abc" });

      expect(semToken.statusCode).toBe(401);
      expect(semToken.json().code).toBe("NAO_AUTENTICADO");
      expect(invalido.statusCode).toBe(401);
    });

    it("RN011: dataFim anterior a dataInicio → 400 apontando dataFim", async () => {
      const direx = await criarUsuarioComToken(app, "DIREX");

      const response = await criar(
        { ...evento, dataFim: "2026-11-09" },
        direx.headers,
      );

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe("VALIDATION_ERROR");
      expect(JSON.stringify(response.json().details)).toContain("dataFim");
    });

    it("RN011: aceita dataFim igual a dataInicio e rejeita data inexistente", async () => {
      const direx = await criarUsuarioComToken(app, "DIREX");

      const mesmoDia = await criar(
        { ...evento, dataFim: evento.dataInicio },
        direx.headers,
      );
      const inexistente = await criar(
        { ...evento, dataInicio: "2026-02-31", dataFim: "2026-03-01" },
        direx.headers,
      );

      expect(mesmoDia.statusCode).toBe(201);
      expect(inexistente.statusCode).toBe(400);
    });

    it("rejeita HTML no nome e campos obrigatórios ausentes", async () => {
      const direx = await criarUsuarioComToken(app, "DIREX");

      const html = await criar(
        { ...evento, nome: "<b>Evento</b>" },
        direx.headers,
      );
      const vazio = await criar({}, direx.headers);

      expect(html.statusCode).toBe(400);
      expect(vazio.statusCode).toBe(400);
      expect(await prisma.evento.count()).toBe(0);
    });
  });

  describe("GET /eventos — RF009", () => {
    const listar = (query = "", headers?: Record<string, string>) =>
      app.inject({ method: "GET", url: `/eventos${query}`, headers });

    it("exige autenticação (401)", async () => {
      const response = await listar();

      expect(response.statusCode).toBe(401);
    });

    it("MEMBRO lista eventos do mais recente para o mais antigo, com meta", async () => {
      const direx = await criarUsuarioComToken(app, "DIREX");
      const membro = await criarUsuarioComToken(app, "MEMBRO");
      for (const [nome, inicio] of [
        ["Janeiro", "2026-01-10"],
        ["Maio", "2026-05-20"],
        ["Março", "2026-03-05"],
      ] as const) {
        await criar(
          {
            nome: `Evento ${nome}`,
            local: "Local",
            dataInicio: inicio,
            dataFim: inicio,
          },
          direx.headers,
        );
      }

      const response = await listar("", membro.headers);
      const body = response.json();

      expect(response.statusCode).toBe(200);
      expect(body.data.map((e: { nome: string }) => e.nome)).toEqual([
        "Evento Maio",
        "Evento Março",
        "Evento Janeiro",
      ]);
      expect(body.meta).toEqual({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
      });
      expect(response.body).not.toMatch(/usuarioId/);
    });

    it("pagina com page/limit", async () => {
      const direx = await criarUsuarioComToken(app, "DIREX");
      for (const dia of ["01", "02", "03"]) {
        await criar(
          {
            ...evento,
            nome: `Evento ${dia}`,
            dataInicio: `2026-06-${dia}`,
            dataFim: `2026-06-${dia}`,
          },
          direx.headers,
        );
      }

      const response = await listar("?page=2&limit=2", direx.headers);
      const body = response.json();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].nome).toBe("Evento 01");
      expect(body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    });

    it("sem eventos devolve lista vazia", async () => {
      const membro = await criarUsuarioComToken(app, "MEMBRO");

      const response = await listar("", membro.headers);

      expect(response.json()).toEqual({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    });

    it("rejeita limit acima de 50 e page menor que 1 (400)", async () => {
      const membro = await criarUsuarioComToken(app, "MEMBRO");

      const limite = await listar("?limit=51", membro.headers);
      const pagina = await listar("?page=0", membro.headers);

      expect(limite.statusCode).toBe(400);
      expect(pagina.statusCode).toBe(400);
    });
  });
});
