import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarFederacao, criarUsuarioComToken } from "../Helpers/Factories";
import {
  setupIntegration,
  teardownIntegration,
} from "../Helpers/SetupIntegration";

type TestApp = Awaited<ReturnType<typeof setupIntegration>>;

describe("GET /federacoes — RF012 (integração)", () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await setupIntegration({
      rateLimitMax: 1000,
      authRateLimitMax: 1000,
    });
  });

  afterAll(teardownIntegration);

  const listar = (query = "", headers?: Record<string, string>) =>
    app.inject({ method: "GET", url: `/federacoes${query}`, headers });

  async function cenario() {
    const membro = await criarUsuarioComToken(app, "MEMBRO");
    await criarFederacao({
      nome: "Federação das EJs do Ceará",
      sigla: "FEJECE",
      estado: "CE",
      regiao: "Nordeste",
    });
    await criarFederacao({
      nome: "Federação das EJs de São Paulo",
      sigla: "FEJESP",
      estado: "SP",
      regiao: "Sudeste",
    });
    await criarFederacao({
      nome: "Federação das EJs do Amazonas",
      sigla: "Baré Júnior",
      estado: "AM",
      regiao: "Norte",
    });
    return membro.headers;
  }

  it("exige autenticação (401)", async () => {
    const response = await listar();

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe("NAO_AUTENTICADO");
  });

  it("lista ordenada por nome com meta e sem campos internos", async () => {
    const headers = await cenario();

    const response = await listar("", headers);
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.data.map((f: { sigla: string }) => f.sigla)).toEqual([
      "FEJESP",
      "Baré Júnior",
      "FEJECE",
    ]);
    expect(Object.keys(body.data[0]).sort()).toEqual([
      "estado",
      "id",
      "nome",
      "regiao",
      "sigla",
    ]);
    expect(body.meta).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });
  });

  it("busca parcial sem acento e sem diferenciar caixa (nome e sigla)", async () => {
    const headers = await cenario();

    const porNome = await listar("?q=sao%20PAULO", headers);
    const porSigla = await listar("?q=bare", headers);

    expect(porNome.json().data.map((f: { sigla: string }) => f.sigla)).toEqual([
      "FEJESP",
    ]);
    expect(porSigla.json().data.map((f: { sigla: string }) => f.sigla)).toEqual(
      ["Baré Júnior"],
    );
  });

  it("filtra por estado (aceita minúsculas) e combina com q", async () => {
    const headers = await cenario();

    const estado = await listar("?estado=ce", headers);
    const combinado = await listar("?estado=SP&q=ceara", headers);

    expect(estado.json().data).toHaveLength(1);
    expect(estado.json().data[0].estado).toBe("CE");
    expect(combinado.json().data).toEqual([]);
  });

  it("pagina e rejeita parâmetros inválidos (400)", async () => {
    const headers = await cenario();

    const pagina = await listar("?page=2&limit=2", headers);
    const limite = await listar("?limit=51", headers);
    const uf = await listar("?estado=CEA", headers);

    expect(pagina.json().data).toHaveLength(1);
    expect(pagina.json().meta).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
    expect(limite.statusCode).toBe(400);
    expect(uf.statusCode).toBe(400);
  });
});
