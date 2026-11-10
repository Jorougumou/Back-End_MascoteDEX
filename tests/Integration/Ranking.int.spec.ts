import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/Infra/Database/Prisma";
import {
  criarCaptura,
  criarEmpresaJunior,
  criarEvento,
  criarFederacao,
  criarMascote,
  criarUsuarioComToken,
} from "../Helpers/Factories";
import {
  setupIntegration,
  teardownIntegration,
} from "../Helpers/SetupIntegration";

type TestApp = Awaited<ReturnType<typeof setupIntegration>>;

describe("Ranking (integração) — RF010, RN012", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await setupIntegration({
      rateLimitMax: 1000,
      authRateLimitMax: 1000,
    });
  });

  afterAll(teardownIntegration);

  async function usuario(email: string, nome: string) {
    const criado = await criarUsuarioComToken(app, "MEMBRO", email);
    await prisma.usuario.update({ where: { id: criado.id }, data: { nome } });
    return criado;
  }

  async function cenario() {
    const ana = await usuario("ana@email.com", "Ana");
    const bia = await usuario("bia@email.com", "Bia");
    const caio = await usuario("caio@email.com", "Caio");

    const federacao = await criarFederacao();
    const ej = await criarEmpresaJunior(federacao.id);
    const mascoteA = await criarMascote(ana.id, ej.id, "Mascote A");
    const mascoteB = await criarMascote(ana.id, ej.id, "Mascote B");
    const mascoteC = await criarMascote(ana.id, ej.id, "Mascote C");
    const evento1 = await criarEvento(ana.id, { nome: "Evento 1" });
    const evento2 = await criarEvento(ana.id, { nome: "Evento 2" });

    return {
      ana,
      bia,
      caio,
      mascotes: { a: mascoteA, b: mascoteB, c: mascoteC },
      evento1,
      evento2,
    };
  }

  const buscar = (url: string, headers?: Record<string, string>) =>
    app.inject({ method: "GET", url, headers });

  it("sem parâmetros: contagem distinta no ranking geral", async () => {
    const { ana, bia, mascotes, evento1, evento2 } = await cenario();
    // Ana captura o mesmo mascote A em dois eventos + B = 2 distintos (não 3).
    await criarCaptura({
      usuarioId: ana.id,
      mascoteId: mascotes.a.id,
      eventoId: evento1.id,
      capturadoEm: "2026-11-10T10:00:00.000Z",
    });
    await criarCaptura({
      usuarioId: ana.id,
      mascoteId: mascotes.a.id,
      eventoId: evento2.id,
      capturadoEm: "2026-11-11T10:00:00.000Z",
    });
    await criarCaptura({
      usuarioId: ana.id,
      mascoteId: mascotes.b.id,
      eventoId: evento1.id,
      capturadoEm: "2026-11-10T11:00:00.000Z",
    });
    await criarCaptura({
      usuarioId: bia.id,
      mascoteId: mascotes.a.id,
      eventoId: evento1.id,
      capturadoEm: "2026-11-10T12:00:00.000Z",
    });

    const response = await buscar("/ranking", ana.headers);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [
        { posicao: 1, usuarioId: ana.id, nome: "Ana", total: 2 },
        { posicao: 2, usuarioId: bia.id, nome: "Bia", total: 1 },
      ],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
      me: { posicao: 1, total: 2 },
    });
  });

  it("ordena por total decrescente", async () => {
    const { ana, bia, caio, mascotes, evento1 } = await cenario();
    const capturar = (usuarioId: string, mascoteId: string, hora: number) =>
      criarCaptura({
        usuarioId,
        mascoteId,
        eventoId: evento1.id,
        capturadoEm: `2026-11-10T${String(hora).padStart(2, "0")}:00:00.000Z`,
      });
    await capturar(ana.id, mascotes.a.id, 8);
    await capturar(bia.id, mascotes.a.id, 9);
    await capturar(bia.id, mascotes.b.id, 10);
    await capturar(bia.id, mascotes.c.id, 11);
    await capturar(caio.id, mascotes.a.id, 12);
    await capturar(caio.id, mascotes.b.id, 13);

    const response = await buscar("/ranking", ana.headers);

    expect(response.json().data.map((i: { nome: string }) => i.nome)).toEqual([
      "Bia",
      "Caio",
      "Ana",
    ]);
    expect(response.json().data.map((i: { total: number }) => i.total)).toEqual(
      [3, 2, 1],
    );
  });

  it("empate: quem atingiu o total primeiro (última captura mais antiga) fica à frente", async () => {
    const { ana, bia, mascotes, evento1 } = await cenario();
    // Ambos com 2 mascotes; Bia completou às 09:00 e Ana às 15:00.
    await criarCaptura({
      usuarioId: ana.id,
      mascoteId: mascotes.a.id,
      eventoId: evento1.id,
      capturadoEm: "2026-11-10T08:00:00.000Z",
    });
    await criarCaptura({
      usuarioId: ana.id,
      mascoteId: mascotes.b.id,
      eventoId: evento1.id,
      capturadoEm: "2026-11-10T15:00:00.000Z",
    });
    await criarCaptura({
      usuarioId: bia.id,
      mascoteId: mascotes.a.id,
      eventoId: evento1.id,
      capturadoEm: "2026-11-10T08:30:00.000Z",
    });
    await criarCaptura({
      usuarioId: bia.id,
      mascoteId: mascotes.b.id,
      eventoId: evento1.id,
      capturadoEm: "2026-11-10T09:00:00.000Z",
    });

    const response = await buscar("/ranking", ana.headers);

    expect(response.json().data.map((i: { nome: string }) => i.nome)).toEqual([
      "Bia",
      "Ana",
    ]);
    expect(response.json().me).toEqual({ posicao: 2, total: 2 });
  });

  it("?eventoId=: considera só as capturas do evento", async () => {
    const { ana, bia, mascotes, evento1, evento2 } = await cenario();
    await criarCaptura({
      usuarioId: ana.id,
      mascoteId: mascotes.a.id,
      eventoId: evento1.id,
      capturadoEm: "2026-11-10T10:00:00.000Z",
    });
    await criarCaptura({
      usuarioId: ana.id,
      mascoteId: mascotes.b.id,
      eventoId: evento1.id,
      capturadoEm: "2026-11-10T11:00:00.000Z",
    });
    await criarCaptura({
      usuarioId: bia.id,
      mascoteId: mascotes.c.id,
      eventoId: evento2.id,
      capturadoEm: "2026-11-11T10:00:00.000Z",
    });

    const doEvento2 = await buscar(
      `/ranking?eventoId=${evento2.id}`,
      ana.headers,
    );

    expect(doEvento2.statusCode).toBe(200);
    expect(doEvento2.json()).toEqual({
      data: [{ posicao: 1, usuarioId: bia.id, nome: "Bia", total: 1 }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      me: null, // Ana não capturou nada no evento 2
    });
  });

  it("evento inexistente → 404 NAO_ENCONTRADO", async () => {
    const { ana } = await cenario();

    const response = await buscar(
      `/ranking?eventoId=${randomUUID()}`,
      ana.headers,
    );

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe("NAO_ENCONTRADO");
  });

  it("evento sem capturas → ranking vazio e me null", async () => {
    const { ana, evento1 } = await cenario();

    const response = await buscar(
      `/ranking?eventoId=${evento1.id}`,
      ana.headers,
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      me: null,
    });
  });

  it("paginação: devolve a página pedida e me com a posição global", async () => {
    const { ana, bia, caio, mascotes, evento1 } = await cenario();
    // Caio 3, Bia 2, Ana 1.
    const capturar = (usuarioId: string, mascoteId: string, minuto: number) =>
      criarCaptura({
        usuarioId,
        mascoteId,
        eventoId: evento1.id,
        capturadoEm: `2026-11-10T10:${String(minuto).padStart(2, "0")}:00.000Z`,
      });
    await capturar(caio.id, mascotes.a.id, 1);
    await capturar(caio.id, mascotes.b.id, 2);
    await capturar(caio.id, mascotes.c.id, 3);
    await capturar(bia.id, mascotes.a.id, 4);
    await capturar(bia.id, mascotes.b.id, 5);
    await capturar(ana.id, mascotes.a.id, 6);

    const pagina2 = await buscar("/ranking?page=2&limit=1", ana.headers);
    const pagina1 = await buscar("/ranking?page=1&limit=1", ana.headers);
    const alemDoFim = await buscar("/ranking?page=9&limit=1", ana.headers);

    expect(pagina2.json()).toEqual({
      data: [{ posicao: 2, usuarioId: bia.id, nome: "Bia", total: 2 }],
      meta: { page: 2, limit: 1, total: 3, totalPages: 3 },
      me: { posicao: 3, total: 1 }, // Ana não aparece nesta página
    });
    expect(pagina1.json().data).toEqual([
      { posicao: 1, usuarioId: caio.id, nome: "Caio", total: 3 },
    ]);
    expect(pagina1.json().me).toEqual({ posicao: 3, total: 1 });
    expect(alemDoFim.json().data).toEqual([]);
    expect(alemDoFim.json().meta.total).toBe(3);
  });

  it("sem token ou token inválido → 401 NAO_AUTENTICADO", async () => {
    const semToken = await buscar("/ranking");
    const invalido = await buscar("/ranking", { authorization: "Bearer abc" });

    expect(semToken.statusCode).toBe(401);
    expect(semToken.json().code).toBe("NAO_AUTENTICADO");
    expect(invalido.statusCode).toBe(401);
  });

  it("parâmetros inválidos → 400 VALIDATION_ERROR", async () => {
    const { ana } = await cenario();

    for (const query of [
      "eventoId=abc",
      "page=0",
      "limit=0",
      "limit=51",
      "page=x",
    ]) {
      const response = await buscar(`/ranking?${query}`, ana.headers);
      expect(response.statusCode, query).toBe(400);
      expect(response.json().code, query).toBe("VALIDATION_ERROR");
    }
  });
});
