import { describe, expect, it } from "vitest";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import type {
  MascoteRepository,
  PerfilMascoteRegistro,
} from "@/Modules/Mascotes/MascoteRepository";
import {
  mascoteParamsSchema,
  mascotePerfilSchema,
} from "@/Modules/Mascotes/MascoteSchemas";
import {
  criarServicoDeLeitura,
  repositorioBase,
} from "../Helpers/MascoteFakes";

function registro(
  parcial: Partial<PerfilMascoteRegistro> = {},
): PerfilMascoteRegistro {
  return {
    id: crypto.randomUUID(),
    nome: "Leão",
    fotoUrl: "https://exemplo.com/leao.jpg",
    capturado: false,
    capturadoEm: null,
    empresaJunior: {
      id: crypto.randomUUID(),
      nome: "Júnior Consultoria",
      universidade: "USP",
      curiosidades: "Fundada em 1990.",
      federacao: {
        nome: "Federação SP",
        sigla: "FSP",
        estado: "SP",
        regiao: "Sudeste",
      },
    },
    eventos: [],
    ...parcial,
  };
}

function criarRepositorioFalso(resultado: PerfilMascoteRegistro | null) {
  const consultas: { id: string; usuarioId: string }[] = [];

  const repository: MascoteRepository = {
    ...repositorioBase(),
    async listarGaleria() {
      return { itens: [], total: 0 };
    },
    async buscarPerfil(id, usuarioId) {
      consultas.push({ id, usuarioId });
      return resultado;
    },
  };

  return { repository, consultas };
}

describe("RF007/RN017 — perfil do mascote no service", () => {
  it("consulta o repositório com o id do mascote e o id do usuário logado", async () => {
    const { repository, consultas } = criarRepositorioFalso(registro());
    const service = criarServicoDeLeitura(repository);
    const id = crypto.randomUUID();
    const usuarioId = crypto.randomUUID();

    await service.buscarPerfil(id, usuarioId);

    expect(consultas).toEqual([{ id, usuarioId }]);
  });

  it("UC-07 FA01: mascote inexistente lança NAO_ENCONTRADO (404)", async () => {
    const { repository } = criarRepositorioFalso(null);
    const service = criarServicoDeLeitura(repository);

    const erro = await service
      .buscarPerfil(crypto.randomUUID(), crypto.randomUUID())
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(AppError);
    expect(erro).toMatchObject({
      code: ErrorCodes.NAO_ENCONTRADO,
      statusCode: 404,
    });
  });

  it("monta o perfil com a federação no nível do mascote", async () => {
    const dados = registro();
    const { repository } = criarRepositorioFalso(dados);
    const service = criarServicoDeLeitura(repository);

    const perfil = await service.buscarPerfil(dados.id, crypto.randomUUID());

    expect(perfil.federacao).toEqual({
      nome: "Federação SP",
      sigla: "FSP",
      estado: "SP",
      regiao: "Sudeste",
    });
    expect(perfil.empresaJunior).toEqual({
      id: dados.empresaJunior.id,
      nome: "Júnior Consultoria",
      universidade: "USP",
      curiosidades: "Fundada em 1990.",
    });
    expect(perfil.empresaJunior).not.toHaveProperty("federacao");
  });

  it("formata as datas dos eventos como YYYY-MM-DD e mantém a ordem", async () => {
    const dados = registro({
      eventos: [
        {
          id: crypto.randomUUID(),
          nome: "Evento B",
          local: "Fortaleza",
          dataInicio: new Date("2026-05-10T00:00:00.000Z"),
          dataFim: new Date("2026-05-12T00:00:00.000Z"),
        },
        {
          id: crypto.randomUUID(),
          nome: "Evento A",
          local: "São Paulo",
          dataInicio: new Date("2026-01-03T00:00:00.000Z"),
          dataFim: new Date("2026-01-03T00:00:00.000Z"),
        },
      ],
    });
    const { repository } = criarRepositorioFalso(dados);
    const service = criarServicoDeLeitura(repository);

    const perfil = await service.buscarPerfil(dados.id, crypto.randomUUID());

    expect(
      perfil.eventos.map((e) => [e.nome, e.dataInicio, e.dataFim]),
    ).toEqual([
      ["Evento B", "2026-05-10", "2026-05-12"],
      ["Evento A", "2026-01-03", "2026-01-03"],
    ]);
  });

  // Na prática todo mascote nasce com a captura do cadastrante (RN009); aqui
  // só garantimos que a lista vazia (dado inconsistente) não quebra a resposta.
  it("curiosidades nula é aceita e lista de eventos vazia não quebra o perfil", async () => {
    const dados = registro();
    dados.empresaJunior.curiosidades = null;
    const { repository } = criarRepositorioFalso(dados);
    const service = criarServicoDeLeitura(repository);

    const perfil = await service.buscarPerfil(dados.id, crypto.randomUUID());

    expect(perfil.eventos).toEqual([]);
    expect(perfil.empresaJunior.curiosidades).toBeNull();
    expect(mascotePerfilSchema.safeParse(perfil).success).toBe(true);
  });
});

describe("RF007 — flag capturado no perfil (usuário logado)", () => {
  it("devolve capturado: true quando o usuário logado já capturou o mascote", async () => {
    const dados = registro({
      capturado: true,
      capturadoEm: new Date("2026-05-20T15:30:00.000Z"),
    });
    const { repository } = criarRepositorioFalso(dados);
    const service = criarServicoDeLeitura(repository);

    const perfil = await service.buscarPerfil(dados.id, crypto.randomUUID());

    expect(perfil.capturado).toBe(true);
  });

  it("devolve capturado: false quando o usuário logado ainda não capturou o mascote", async () => {
    const dados = registro({ capturado: false });
    const { repository } = criarRepositorioFalso(dados);
    const service = criarServicoDeLeitura(repository);

    const perfil = await service.buscarPerfil(dados.id, crypto.randomUUID());

    expect(perfil.capturado).toBe(false);
  });

  it("o schema da resposta exige capturado booleano", async () => {
    const dados = registro({ capturado: true });
    const { repository } = criarRepositorioFalso(dados);
    const service = criarServicoDeLeitura(repository);
    const perfil = await service.buscarPerfil(dados.id, crypto.randomUUID());

    expect(mascotePerfilSchema.safeParse(perfil).success).toBe(true);

    const { capturado: _omitido, ...semCapturado } = perfil;
    expect(mascotePerfilSchema.safeParse(semCapturado).success).toBe(false);
    expect(
      mascotePerfilSchema.safeParse({ ...perfil, capturado: "true" }).success,
    ).toBe(false);
  });
});

describe("RF007 — capturadoEm no perfil (data da captura do usuário logado)", () => {
  it("devolve a data/hora da captura em ISO 8601 (UTC)", async () => {
    const dados = registro({
      capturado: true,
      capturadoEm: new Date("2026-05-20T15:30:00.000Z"),
    });
    const { repository } = criarRepositorioFalso(dados);
    const service = criarServicoDeLeitura(repository);

    const perfil = await service.buscarPerfil(dados.id, crypto.randomUUID());

    expect(perfil.capturadoEm).toBe("2026-05-20T15:30:00.000Z");
    expect(mascotePerfilSchema.safeParse(perfil).success).toBe(true);
  });

  it("devolve capturadoEm: null quando o usuário logado ainda não capturou o mascote", async () => {
    const dados = registro({ capturado: false, capturadoEm: null });
    const { repository } = criarRepositorioFalso(dados);
    const service = criarServicoDeLeitura(repository);

    const perfil = await service.buscarPerfil(dados.id, crypto.randomUUID());

    expect(perfil.capturadoEm).toBeNull();
    expect(mascotePerfilSchema.safeParse(perfil).success).toBe(true);
  });

  it("o schema da resposta exige capturadoEm (data ISO ou null)", async () => {
    const dados = registro({
      capturado: true,
      capturadoEm: new Date("2026-05-20T15:30:00.000Z"),
    });
    const { repository } = criarRepositorioFalso(dados);
    const service = criarServicoDeLeitura(repository);
    const perfil = await service.buscarPerfil(dados.id, crypto.randomUUID());

    const { capturadoEm: _omitido, ...semCapturadoEm } = perfil;
    expect(mascotePerfilSchema.safeParse(semCapturadoEm).success).toBe(false);
    expect(
      mascotePerfilSchema.safeParse({ ...perfil, capturadoEm: "ontem" })
        .success,
    ).toBe(false);
    expect(
      mascotePerfilSchema.safeParse({ ...perfil, capturadoEm: null }).success,
    ).toBe(true);
  });
});

describe("RF007 — validação do parâmetro da rota", () => {
  it("aceita um uuid", () => {
    const id = crypto.randomUUID();

    expect(mascoteParamsSchema.parse({ id })).toEqual({ id });
  });

  it("rejeita id que não é uuid", () => {
    expect(mascoteParamsSchema.safeParse({ id: "abc" }).success).toBe(false);
    expect(mascoteParamsSchema.safeParse({ id: "123" }).success).toBe(false);
    expect(mascoteParamsSchema.safeParse({}).success).toBe(false);
  });
});
