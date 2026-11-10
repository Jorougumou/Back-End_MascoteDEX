import { describe, expect, it } from "vitest";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import type {
  ConsultaRanking,
  LinhaRanking,
  RankingRepository,
  ResultadoRanking,
} from "@/Modules/Ranking/RankingRepository";
import {
  rankingQuerySchema,
  rankingResponseSchema,
} from "@/Modules/Ranking/RankingSchemas";
import { createRankingService } from "@/Modules/Ranking/RankingService";

const usuarioLogadoId = "11111111-1111-4111-8111-111111111111";
const eventoId = "22222222-2222-4222-8222-222222222222";

const linha = (posicao: number, total = 1): LinhaRanking => ({
  posicao,
  usuarioId: crypto.randomUUID(),
  nome: `Usuário ${posicao}`,
  total,
});

function criarRepositorioFalso(
  resultado: Partial<ResultadoRanking> = {},
  eventoExiste = true,
) {
  const consultas: ConsultaRanking[] = [];
  const repository: RankingRepository = {
    async eventoExiste() {
      return eventoExiste;
    },
    async listar(consulta) {
      consultas.push(consulta);
      return { itens: [], totalUsuarios: 0, me: null, ...resultado };
    },
  };
  return { repository, consultas };
}

describe("RF010 — service do ranking", () => {
  it("ranking geral: não valida evento e repassa eventoId indefinido", async () => {
    const { repository, consultas } = criarRepositorioFalso({
      itens: [linha(1, 3), linha(2, 2)],
      totalUsuarios: 2,
    });
    const service = createRankingService({ rankingRepository: repository });

    const resultado = await service.listar({
      usuarioLogadoId,
      page: 1,
      limit: 20,
    });

    expect(consultas[0]).toMatchObject({ usuarioId: usuarioLogadoId, skip: 0 });
    expect(consultas[0]?.eventoId).toBeUndefined();
    expect(resultado.data.map((item) => item.posicao)).toEqual([1, 2]);
  });

  it("ranking por evento: repassa eventoId ao repositório", async () => {
    const { repository, consultas } = criarRepositorioFalso();
    const service = createRankingService({ rankingRepository: repository });

    await service.listar({ usuarioLogadoId, eventoId, page: 1, limit: 20 });

    expect(consultas[0]?.eventoId).toBe(eventoId);
  });

  it("evento inexistente → NAO_ENCONTRADO (404) sem consultar o ranking", async () => {
    const { repository, consultas } = criarRepositorioFalso({}, false);
    const service = createRankingService({ rankingRepository: repository });

    await expect(
      service.listar({ usuarioLogadoId, eventoId, page: 1, limit: 20 }),
    ).rejects.toMatchObject({
      code: ErrorCodes.NAO_ENCONTRADO,
      statusCode: 404,
    });
    await expect(
      service.listar({ usuarioLogadoId, eventoId, page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(AppError);
    expect(consultas).toHaveLength(0);
  });

  it("paginação: converte page/limit em skip/take e calcula o meta", async () => {
    const { repository, consultas } = criarRepositorioFalso({
      itens: [linha(21)],
      totalUsuarios: 45,
    });
    const service = createRankingService({ rankingRepository: repository });

    const resultado = await service.listar({
      usuarioLogadoId,
      page: 3,
      limit: 20,
    });

    expect(consultas[0]).toMatchObject({ skip: 40, take: 20 });
    expect(resultado.meta).toEqual({
      page: 3,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it("me vem independente da página (usuário fora da página atual)", async () => {
    const { repository } = criarRepositorioFalso({
      itens: [linha(1, 9)],
      totalUsuarios: 25,
      me: { posicao: 17, total: 2 },
    });
    const service = createRankingService({ rankingRepository: repository });

    const resultado = await service.listar({
      usuarioLogadoId,
      page: 1,
      limit: 1,
    });

    expect(resultado.data).toHaveLength(1);
    expect(resultado.me).toEqual({ posicao: 17, total: 2 });
  });

  it("usuário sem capturas no escopo → me: null", async () => {
    const { repository } = criarRepositorioFalso({
      itens: [linha(1)],
      totalUsuarios: 1,
      me: null,
    });
    const service = createRankingService({ rankingRepository: repository });

    const resultado = await service.listar({
      usuarioLogadoId,
      page: 1,
      limit: 20,
    });

    expect(resultado.me).toBeNull();
  });

  it("ranking vazio → data [] e totalPages 0", async () => {
    const { repository } = criarRepositorioFalso();
    const service = createRankingService({ rankingRepository: repository });

    const resultado = await service.listar({
      usuarioLogadoId,
      eventoId,
      page: 1,
      limit: 20,
    });

    expect(resultado.data).toEqual([]);
    expect(resultado.meta.totalPages).toBe(0);
  });
});

describe("RF010 — schemas do ranking", () => {
  it("query: padrão 1/20, eventoId opcional e UUID", () => {
    expect(rankingQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(rankingQuerySchema.parse({ eventoId }).eventoId).toBe(eventoId);
    expect(rankingQuerySchema.safeParse({ eventoId: "abc" }).success).toBe(
      false,
    );
    expect(rankingQuerySchema.safeParse({ limit: "51" }).success).toBe(false);
    expect(rankingQuerySchema.safeParse({ page: "0" }).success).toBe(false);
  });

  it("resposta: aceita me nulo e exige { posicao, total } quando presente", () => {
    const base = {
      data: [{ posicao: 1, usuarioId: usuarioLogadoId, nome: "A", total: 2 }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    expect(rankingResponseSchema.safeParse({ ...base, me: null }).success).toBe(
      true,
    );
    expect(
      rankingResponseSchema.safeParse({ ...base, me: { posicao: 1, total: 2 } })
        .success,
    ).toBe(true);
    expect(
      rankingResponseSchema.safeParse({ ...base, me: { posicao: 1 } }).success,
    ).toBe(false);
  });
});
