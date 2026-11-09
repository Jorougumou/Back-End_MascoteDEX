import { describe, expect, it } from "vitest";
import type { FederacaoRepository } from "@/Modules/Federacoes/FederacaoRepository";
import { listarFederacoesQuerySchema } from "@/Modules/Federacoes/FederacaoSchemas";
import { createFederacaoService } from "@/Modules/Federacoes/FederacaoService";

const base = [
  {
    nome: "Federação das EJs do Ceará",
    sigla: "FEJECE",
    estado: "CE",
    regiao: "Nordeste",
  },
  {
    nome: "Federação das EJs de São Paulo",
    sigla: "FEJESP",
    estado: "SP",
    regiao: "Sudeste",
  },
  {
    nome: "Federação das EJs do Amazonas",
    sigla: "Baré Júnior",
    estado: "AM",
    regiao: "Norte",
  },
].map((federacao, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  ...federacao,
}));

function criarServico() {
  const filtros: Array<{ estado?: string | undefined }> = [];
  const federacaoRepository: FederacaoRepository = {
    async listarTodas(filtro) {
      filtros.push(filtro);
      return filtro.estado
        ? base.filter((f) => f.estado === filtro.estado)
        : base;
    },
  };
  return { service: createFederacaoService({ federacaoRepository }), filtros };
}

const query = (extra: object = {}) => listarFederacoesQuerySchema.parse(extra);

describe("RF012 — listar federações", () => {
  it("busca parcial sem acento e sem diferenciar caixa em nome e sigla", async () => {
    const { service } = criarServico();

    const porNome = await service.listar(query({ q: "SAO paulo" }));
    const porSigla = await service.listar(query({ q: "bare junior" }));

    expect(porNome.data.map((f) => f.sigla)).toEqual(["FEJESP"]);
    expect(porSigla.data.map((f) => f.sigla)).toEqual(["Baré Júnior"]);
  });

  it("repassa o filtro de estado ao repositório", async () => {
    const { service, filtros } = criarServico();

    const resposta = await service.listar(query({ estado: "ce" }));

    expect(filtros[0]).toEqual({ estado: "CE" });
    expect(resposta.data).toHaveLength(1);
  });

  it("pagina e informa o meta com o total filtrado", async () => {
    const { service } = criarServico();

    const resposta = await service.listar(query({ page: 2, limit: 2 }));

    expect(resposta.data).toHaveLength(1);
    expect(resposta.meta).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
  });

  it("sem resultado devolve lista vazia e totalPages 0", async () => {
    const { service } = criarServico();

    const resposta = await service.listar(query({ q: "inexistente" }));

    expect(resposta.data).toEqual([]);
    expect(resposta.meta.totalPages).toBe(0);
  });
});

describe("RF012 — query de federações", () => {
  it("q vazio vira ausente e estado é normalizado para maiúsculas", () => {
    expect(query({ q: "   ", estado: " ce " })).toMatchObject({
      q: undefined,
      estado: "CE",
    });
  });

  it("rejeita UF inválida e limit acima de 50", () => {
    expect(
      listarFederacoesQuerySchema.safeParse({ estado: "CEA" }).success,
    ).toBe(false);
    expect(listarFederacoesQuerySchema.safeParse({ limit: 51 }).success).toBe(
      false,
    );
  });
});
