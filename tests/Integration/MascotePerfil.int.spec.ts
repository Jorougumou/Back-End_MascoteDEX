import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/Infra/Database/Prisma";
import { normalizarTexto } from "@/Shared/Utils/Normalize";
import {
  setupIntegration,
  teardownIntegration,
} from "../Helpers/SetupIntegration";

type TestApp = Awaited<ReturnType<typeof setupIntegration>>;

afterAll(teardownIntegration);

async function cadastrarELogar(app: TestApp, email: string) {
  await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { nome: "Ana", email, senha: "senha-segura-123" },
  });
  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, senha: "senha-segura-123" },
  });
  const corpo = login.json();
  return { token: corpo.token as string, id: corpo.usuario.id as string };
}

async function cenario(app: TestApp) {
  const ana = await cadastrarELogar(app, "ana@email.com");
  const bia = await cadastrarELogar(app, "bia@email.com");
  // Cadu nunca captura nada: serve para provar que `capturado` é por usuário.
  const cadu = await cadastrarELogar(app, "cadu@email.com");

  const federacao = await prisma.federacao.create({
    data: {
      nome: "Federação SP",
      sigla: "FSP",
      estado: "SP",
      regiao: "Sudeste",
    },
  });
  const criarEj = (nome: string, curiosidades: string | null) =>
    prisma.empresaJunior.create({
      data: {
        nome,
        nomeNormalizado: normalizarTexto(nome),
        universidade: "USP",
        curiosidades,
        federacaoId: federacao.id,
      },
    });
  const ejComCuriosidade = await criarEj(
    "Júnior Consultoria",
    "Fundada em 1990.",
  );
  const ejSemCuriosidade = await criarEj("Alfa Engenharia", null);

  const criarMascote = (nome: string, empresaJuniorId: string) =>
    prisma.mascote.create({
      data: {
        nome,
        nomeNormalizado: normalizarTexto(nome),
        fotoUrl: `https://exemplo.com/${nome}.jpg`,
        empresaJuniorId,
        usuarioId: ana.id,
      },
    });
  const leao = await criarMascote("Leão", ejComCuriosidade.id);
  const tigre = await criarMascote("Tigre", ejSemCuriosidade.id);

  // Criados em ordem cronológica crescente de propósito: a API deve
  // devolver do mais recente para o mais antigo.
  const criarEvento = (nome: string, inicio: string, fim: string) =>
    prisma.evento.create({
      data: {
        nome,
        local: "Local " + nome,
        dataInicio: new Date(inicio),
        dataFim: new Date(fim),
        usuarioId: ana.id,
      },
    });
  const eventoJan = await criarEvento(
    "Evento Janeiro",
    "2026-01-10",
    "2026-01-12",
  );
  const eventoMar = await criarEvento(
    "Evento Março",
    "2026-03-05",
    "2026-03-05",
  );
  const eventoMai = await criarEvento(
    "Evento Maio",
    "2026-05-20",
    "2026-05-22",
  );

  const capturar = (usuarioId: string, mascoteId: string, eventoId: string) =>
    prisma.captura.create({
      data: {
        usuarioId,
        mascoteId,
        eventoId,
        fotoUrl: "f",
        capturadoEm: new Date(),
      },
    });
  // Leão: capturado por Ana e Bia em Janeiro, só por Ana em Maio (Março não).
  // Bia só capturou o Leão (nunca o Tigre); Cadu não capturou nenhum.
  await capturar(ana.id, leao.id, eventoJan.id);
  await capturar(bia.id, leao.id, eventoJan.id);
  await capturar(ana.id, leao.id, eventoMai.id);
  // Tigre: capturado só em Março (não pode aparecer no perfil do Leão).
  await capturar(ana.id, tigre.id, eventoMar.id);

  return {
    ana,
    bia,
    cadu,
    leao,
    tigre,
    federacao,
    ejComCuriosidade,
    eventoJan,
    eventoMai,
  };
}

describe("GET /mascotes/:id — perfil do mascote (T-22)", () => {
  let app: TestApp;

  beforeEach(async () => {
    app = await setupIntegration({
      rateLimitMax: 10000,
      authRateLimitMax: 10000,
    });
  });

  const get = (token: string | undefined, id: string) =>
    app.inject({
      method: "GET",
      url: `/mascotes/${id}`,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });

  it("401 sem token e com token inválido", async () => {
    const id = crypto.randomUUID();

    expect((await get(undefined, id)).statusCode).toBe(401);
    expect((await get("lixo", id)).statusCode).toBe(401);
  });

  it("400 VALIDATION_ERROR quando o id não é um uuid", async () => {
    const { token } = await cadastrarELogar(app, "ana@email.com");

    const resposta = await get(token, "abc");

    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().code).toBe("VALIDATION_ERROR");
  });

  it("404 NAO_ENCONTRADO quando o mascote não existe (UC-07 FA01)", async () => {
    const { token } = await cadastrarELogar(app, "ana@email.com");

    const resposta = await get(token, crypto.randomUUID());

    expect(resposta.statusCode).toBe(404);
    expect(resposta.json()).toMatchObject({
      statusCode: 404,
      code: "NAO_ENCONTRADO",
      message: "Mascote não encontrado.",
    });
  });

  it("200 com foto, nome, capturado, EJ, universidade, curiosidades e federação/região", async () => {
    const c = await cenario(app);

    const resposta = await get(c.ana.token, c.leao.id);

    expect(resposta.statusCode).toBe(200);
    const perfil = resposta.json();
    expect(perfil).toMatchObject({
      id: c.leao.id,
      nome: "Leão",
      fotoUrl: "https://exemplo.com/Leão.jpg",
      capturado: true,
      empresaJunior: {
        id: c.ejComCuriosidade.id,
        nome: "Júnior Consultoria",
        universidade: "USP",
        curiosidades: "Fundada em 1990.",
      },
      federacao: {
        nome: "Federação SP",
        sigla: "FSP",
        estado: "SP",
        regiao: "Sudeste",
      },
    });
  });

  it("não expõe campos internos", async () => {
    const c = await cenario(app);

    const perfil = (await get(c.ana.token, c.leao.id)).json();

    expect(Object.keys(perfil).sort()).toEqual([
      "capturado",
      "empresaJunior",
      "eventos",
      "federacao",
      "fotoUrl",
      "id",
      "nome",
    ]);
    expect(Object.keys(perfil.empresaJunior).sort()).toEqual([
      "curiosidades",
      "id",
      "nome",
      "universidade",
    ]);
    expect(JSON.stringify(perfil)).not.toMatch(
      /usuarioId|nomeNormalizado|criadoEm/,
    );
  });

  it("eventos: só onde o mascote foi capturado, sem repetir, do mais recente ao mais antigo, com datas", async () => {
    const c = await cenario(app);

    const perfil = (await get(c.ana.token, c.leao.id)).json();

    expect(perfil.eventos).toEqual([
      {
        id: c.eventoMai.id,
        nome: "Evento Maio",
        local: "Local Evento Maio",
        dataInicio: "2026-05-20",
        dataFim: "2026-05-22",
      },
      {
        id: c.eventoJan.id,
        nome: "Evento Janeiro",
        local: "Local Evento Janeiro",
        dataInicio: "2026-01-10",
        dataFim: "2026-01-12",
      },
    ]);
  });

  it("a ordem dos eventos não depende da ordem em que foram criados", async () => {
    const c = await cenario(app);
    const urso = await prisma.mascote.create({
      data: {
        nome: "Urso",
        nomeNormalizado: "urso",
        fotoUrl: "https://exemplo.com/urso.jpg",
        empresaJuniorId: c.ejComCuriosidade.id,
        usuarioId: c.ana.id,
      },
    });
    // Eventos criados do mais recente ao mais antigo e capturas feitas do
    // mais antigo ao mais recente: nenhuma ordem "natural" do banco coincide
    // com a ordem esperada por sorte.
    const datas = ["2027-06-01", "2027-04-01", "2027-02-01", "2027-03-01"];
    const eventos = [];
    for (const data of datas) {
      eventos.push(
        await prisma.evento.create({
          data: {
            nome: `Evento ${data}`,
            local: "Local",
            dataInicio: new Date(data),
            dataFim: new Date(data),
            usuarioId: c.ana.id,
          },
        }),
      );
    }
    const porDataCrescente = [...eventos].sort(
      (a, b) => a.dataInicio.getTime() - b.dataInicio.getTime(),
    );
    for (const evento of porDataCrescente) {
      await prisma.captura.create({
        data: {
          usuarioId: c.ana.id,
          mascoteId: urso.id,
          eventoId: evento.id,
          fotoUrl: "f",
          capturadoEm: new Date(),
        },
      });
    }

    const perfil = (await get(c.ana.token, urso.id)).json();

    expect(
      perfil.eventos.map((e: { dataInicio: string }) => e.dataInicio),
    ).toEqual(["2027-06-01", "2027-04-01", "2027-03-01", "2027-02-01"]);
  });

  it("o perfil é o mesmo para qualquer usuário autenticado, exceto o capturado", async () => {
    const c = await cenario(app);

    const { capturado: daAnaCapturado, ...daAna } = (
      await get(c.ana.token, c.leao.id)
    ).json();
    const { capturado: daBiaCapturado, ...daBia } = (
      await get(c.bia.token, c.leao.id)
    ).json();
    const { capturado: doCaduCapturado, ...doCadu } = (
      await get(c.cadu.token, c.leao.id)
    ).json();

    expect(daBia).toEqual(daAna);
    expect(doCadu).toEqual(daAna);
    expect([daAnaCapturado, daBiaCapturado, doCaduCapturado]).toEqual([
      true,
      true,
      false,
    ]);
  });

  it("mascote recém-cadastrado já traz a captura do cadastrante (RN009) e curiosidades nula", async () => {
    const c = await cenario(app);
    // Mesmo formato do cadastro real: mascote + primeira captura juntos.
    const lobo = await prisma.mascote.create({
      data: {
        nome: "Lobo",
        nomeNormalizado: "lobo",
        fotoUrl: "https://exemplo.com/lobo.jpg",
        empresaJuniorId: (
          await prisma.empresaJunior.findFirstOrThrow({
            where: { curiosidades: null },
          })
        ).id,
        usuarioId: c.ana.id,
        capturas: {
          create: {
            usuarioId: c.ana.id,
            eventoId: c.eventoMai.id,
            fotoUrl: "f",
            capturadoEm: new Date(),
          },
        },
      },
    });

    const resposta = await get(c.ana.token, lobo.id);

    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().empresaJunior.curiosidades).toBeNull();
    expect(
      resposta.json().eventos.map((e: { nome: string }) => e.nome),
    ).toEqual(["Evento Maio"]);
    // O cadastrante já capturou o mascote (RN009); outro usuário ainda não.
    expect(resposta.json().capturado).toBe(true);
    expect((await get(c.bia.token, lobo.id)).json().capturado).toBe(false);
  });

  it("perfil de um mascote não mostra os eventos de outro", async () => {
    const c = await cenario(app);

    const perfil = (await get(c.ana.token, c.tigre.id)).json();

    expect(perfil.eventos.map((e: { nome: string }) => e.nome)).toEqual([
      "Evento Março",
    ]);
  });

  describe("RF007 — flag capturado (usuário logado)", () => {
    const capturado = async (token: string, id: string) =>
      (await get(token, id)).json().capturado as boolean;

    it("true para quem já capturou o mascote", async () => {
      const c = await cenario(app);

      expect(await capturado(c.ana.token, c.leao.id)).toBe(true);
      expect(await capturado(c.ana.token, c.tigre.id)).toBe(true);
    });

    it("false para quem nunca capturou, mesmo que outros usuários tenham capturado", async () => {
      const c = await cenario(app);

      // O Leão tem 3 capturas (de Ana e de Bia), mas nenhuma de Cadu.
      const resposta = await get(c.cadu.token, c.leao.id);

      expect(resposta.json().capturado).toBe(false);
      expect(resposta.json().eventos).toHaveLength(2);
    });

    it("depende do mascote: Bia capturou o Leão, mas não o Tigre", async () => {
      const c = await cenario(app);

      expect(await capturado(c.bia.token, c.leao.id)).toBe(true);
      expect(await capturado(c.bia.token, c.tigre.id)).toBe(false);
    });

    it("não altera a lista de eventos: continua com todos os eventos do mascote", async () => {
      const c = await cenario(app);

      const daBia = (await get(c.bia.token, c.leao.id)).json();
      const doCadu = (await get(c.cadu.token, c.leao.id)).json();

      // Bia só capturou em Janeiro, mas o perfil traz Maio e Janeiro.
      expect(daBia.eventos.map((e: { nome: string }) => e.nome)).toEqual([
        "Evento Maio",
        "Evento Janeiro",
      ]);
      expect(doCadu.eventos).toEqual(daBia.eventos);
    });

    it("bate com o `capturado` da galeria para o mesmo usuário e mascote", async () => {
      const c = await cenario(app);

      for (const usuario of [c.ana, c.bia, c.cadu]) {
        const galeria = await app.inject({
          method: "GET",
          url: "/mascotes",
          headers: { authorization: `Bearer ${usuario.token}` },
        });
        const itens = galeria.json().data as {
          id: string;
          capturado: boolean;
        }[];
        expect(itens).toHaveLength(2);

        for (const item of itens) {
          expect(await capturado(usuario.token, item.id)).toBe(item.capturado);
        }
      }
    });
  });
});
