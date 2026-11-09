import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  criarEmpresaJunior,
  criarFederacao,
  criarUsuarioComToken,
} from "../Helpers/Factories";
import {
  setupIntegration,
  teardownIntegration,
} from "../Helpers/SetupIntegration";

type TestApp = Awaited<ReturnType<typeof setupIntegration>>;

describe("GET /empresas-juniores — RF012 (integração)", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await setupIntegration({
      rateLimitMax: 1000,
      authRateLimitMax: 1000,
    });
  });

  afterAll(teardownIntegration);

  const listar = (query = "", headers?: Record<string, string>) =>
    app.inject({ method: "GET", url: `/empresas-juniores${query}`, headers });

  const nomes = (response: { json: () => { data: Array<{ nome: string }> } }) =>
    response.json().data.map((ej) => ej.nome);

  async function cenario() {
    const membro = await criarUsuarioComToken(app, "MEMBRO");
    const sp = await criarFederacao({ sigla: "FSP", estado: "SP" });
    const ce = await criarFederacao({ sigla: "FCE", estado: "CE" });
    await criarEmpresaJunior(sp.id, {
      nome: "Júnior Consultoria",
      universidade: "USP",
    });
    await criarEmpresaJunior(sp.id, {
      nome: "Alfa Engenharia",
      universidade: "Unicamp",
    });
    await criarEmpresaJunior(ce.id, { nome: "Beta Jr", universidade: "UFC" });
    return { headers: membro.headers, sp, ce };
  }

  it("exige autenticação (401)", async () => {
    const response = await listar();

    expect(response.statusCode).toBe(401);
  });

  it("lista ordenada por nome, com meta e sem nomeNormalizado", async () => {
    const { headers } = await cenario();

    const response = await listar("", headers);
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(nomes(response)).toEqual([
      "Alfa Engenharia",
      "Beta Jr",
      "Júnior Consultoria",
    ]);
    expect(Object.keys(body.data[0]).sort()).toEqual([
      "curiosidades",
      "federacaoId",
      "id",
      "nome",
      "universidade",
    ]);
    expect(response.body).not.toMatch(/nomeNormalizado/);
    expect(body.meta).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });
  });

  it("busca parcial no nome sem acento/caixa e também na universidade", async () => {
    const { headers } = await cenario();

    const porNome = await listar("?q=JUNIOR", headers);
    const porUniversidade = await listar("?q=unicamp", headers);

    expect(nomes(porNome)).toEqual(["Júnior Consultoria"]);
    expect(nomes(porUniversidade)).toEqual(["Alfa Engenharia"]);
  });

  it("filtra por federacaoId e combina com q", async () => {
    const { headers, sp, ce } = await cenario();

    const daFederacao = await listar(`?federacaoId=${sp.id}`, headers);
    const combinado = await listar(`?federacaoId=${ce.id}&q=alfa`, headers);

    expect(nomes(daFederacao)).toEqual([
      "Alfa Engenharia",
      "Júnior Consultoria",
    ]);
    expect(combinado.json().data).toEqual([]);
  });

  it("pagina e rejeita parâmetros inválidos (400)", async () => {
    const { headers } = await cenario();

    const pagina = await listar("?page=2&limit=2", headers);
    const limite = await listar("?limit=51", headers);
    const uuid = await listar("?federacaoId=abc", headers);

    expect(pagina.json().data).toHaveLength(1);
    expect(pagina.json().meta).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
    expect(limite.statusCode).toBe(400);
    expect(uuid.statusCode).toBe(400);
  });
});
