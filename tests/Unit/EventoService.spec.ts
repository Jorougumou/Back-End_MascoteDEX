import { describe, expect, it } from "vitest";
import type {
  EventoRegistro,
  EventoRepository,
  NovoEvento,
} from "@/Modules/Eventos/EventoRepository";
import { criarEventoBodySchema } from "@/Modules/Eventos/EventoSchemas";
import { createEventoService } from "@/Modules/Eventos/EventoService";
import { paginationQuerySchema } from "@/Shared/Schemas/Common";

const usuarioId = "11111111-1111-4111-8111-111111111111";

function criarRepositorioFalso(total = 0) {
  const criados: NovoEvento[] = [];
  const janelas: Array<{ skip: number; take: number }> = [];

  const registro = (dados: NovoEvento): EventoRegistro => ({
    id: crypto.randomUUID(),
    nome: dados.nome,
    local: dados.local,
    dataInicio: dados.dataInicio,
    dataFim: dados.dataFim,
    criadoEm: new Date("2026-11-05T12:00:00.000Z"),
  });

  const repository: EventoRepository = {
    async criar(dados) {
      criados.push(dados);
      return registro(dados);
    },
    async listar(janela) {
      janelas.push(janela);
      const itens = Array.from({ length: Math.min(janela.take, total) }, () =>
        registro({
          nome: "Evento",
          local: "Local",
          dataInicio: new Date("2026-11-10T00:00:00.000Z"),
          dataFim: new Date("2026-11-12T00:00:00.000Z"),
          usuarioId,
        }),
      );
      return { itens, total };
    },
  };

  return { repository, criados, janelas };
}

describe("RF008 — criar evento", () => {
  it("grava com o usuário criador e devolve datas como YYYY-MM-DD", async () => {
    const { repository, criados } = criarRepositorioFalso();
    const service = createEventoService({ eventoRepository: repository });

    const evento = await service.criar(
      {
        nome: "Congresso EJ",
        local: "Fortaleza",
        dataInicio: "2026-11-10",
        dataFim: "2026-11-12",
      },
      usuarioId,
    );

    expect(criados[0]?.usuarioId).toBe(usuarioId);
    expect(evento).toMatchObject({
      nome: "Congresso EJ",
      local: "Fortaleza",
      dataInicio: "2026-11-10",
      dataFim: "2026-11-12",
      criadoEm: "2026-11-05T12:00:00.000Z",
    });
    expect(evento).not.toHaveProperty("usuarioId");
  });
});

describe("RF009 — listar eventos (paginação)", () => {
  it("converte page/limit em skip/take e calcula o meta", async () => {
    const { repository, janelas } = criarRepositorioFalso(45);
    const service = createEventoService({ eventoRepository: repository });

    const resultado = await service.listar({ page: 3, limit: 20 });

    expect(janelas[0]).toEqual({ skip: 40, take: 20 });
    expect(resultado.meta).toEqual({
      page: 3,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
    expect(resultado.data).toHaveLength(20);
  });

  it("lista vazia → totalPages 0", async () => {
    const { repository } = criarRepositorioFalso(0);
    const service = createEventoService({ eventoRepository: repository });

    const resultado = await service.listar({ page: 1, limit: 20 });

    expect(resultado.data).toEqual([]);
    expect(resultado.meta.totalPages).toBe(0);
  });

  it("schema de paginação: padrão 1/20, aceita texto numérico e limita a 50", () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(paginationQuerySchema.parse({ page: "2", limit: "50" })).toEqual({
      page: 2,
      limit: 50,
    });
    expect(paginationQuerySchema.safeParse({ limit: "51" }).success).toBe(
      false,
    );
    expect(paginationQuerySchema.safeParse({ page: "0" }).success).toBe(false);
  });
});

describe("RN011 — datas do evento", () => {
  const base = { nome: "Congresso EJ", local: "Fortaleza" };

  it("aceita dataFim igual ou posterior a dataInicio", () => {
    expect(
      criarEventoBodySchema.safeParse({
        ...base,
        dataInicio: "2026-11-10",
        dataFim: "2026-11-10",
      }).success,
    ).toBe(true);
    expect(
      criarEventoBodySchema.safeParse({
        ...base,
        dataInicio: "2026-11-10",
        dataFim: "2026-11-12",
      }).success,
    ).toBe(true);
  });

  it("rejeita dataFim anterior a dataInicio", () => {
    const resultado = criarEventoBodySchema.safeParse({
      ...base,
      dataInicio: "2026-11-10",
      dataFim: "2026-11-09",
    });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(["dataFim"]);
  });

  it("rejeita data inexistente, formato errado e nome com < ou >", () => {
    const valido = { ...base, dataInicio: "2026-11-10", dataFim: "2026-11-12" };

    expect(
      criarEventoBodySchema.safeParse({ ...valido, dataInicio: "2026-02-31" })
        .success,
    ).toBe(false);
    expect(
      criarEventoBodySchema.safeParse({ ...valido, dataFim: "12/11/2026" })
        .success,
    ).toBe(false);
    expect(
      criarEventoBodySchema.safeParse({ ...valido, nome: "<b>Evento</b>" })
        .success,
    ).toBe(false);
  });
});
