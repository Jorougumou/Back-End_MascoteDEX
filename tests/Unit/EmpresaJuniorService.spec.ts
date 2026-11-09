import { describe, expect, it } from "vitest";
import type {
  EmpresaJuniorRepository,
  FiltroEmpresasJuniores,
} from "@/Modules/EmpresasJuniores/EmpresaJuniorRepository";
import { listarEmpresasJunioresQuerySchema } from "@/Modules/EmpresasJuniores/EmpresaJuniorSchemas";
import { createEmpresaJuniorService } from "@/Modules/EmpresasJuniores/EmpresaJuniorService";

function criarServico(total = 0) {
  const filtros: FiltroEmpresasJuniores[] = [];
  const empresaJuniorRepository: EmpresaJuniorRepository = {
    async listar(filtro) {
      filtros.push(filtro);
      return { itens: [], total };
    },
  };
  return {
    service: createEmpresaJuniorService({ empresaJuniorRepository }),
    filtros,
  };
}

const query = (extra: object = {}) =>
  listarEmpresasJunioresQuerySchema.parse(extra);

describe("RF012 — listar empresas juniores", () => {
  it("normaliza o termo (sem acento, minúsculo) antes de consultar", async () => {
    const { service, filtros } = criarServico();

    await service.listar(query({ q: "  JÚNIOR   Consultoria " }));

    expect(filtros[0]?.termoNormalizado).toBe("junior consultoria");
  });

  it("repassa federacaoId e converte page/limit em skip/take", async () => {
    const { service, filtros } = criarServico();
    const federacaoId = "00000000-0000-4000-8000-000000000001";

    await service.listar(query({ federacaoId, page: 3, limit: 10 }));

    expect(filtros[0]).toMatchObject({ federacaoId, skip: 20, take: 10 });
  });

  it("monta o meta com o total do repositório", async () => {
    const { service } = criarServico(45);

    const resposta = await service.listar(query({ limit: 20 }));

    expect(resposta.meta).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });
});

describe("RF012 — query de empresas juniores", () => {
  it("rejeita federacaoId que não é UUID e limit acima de 50", () => {
    expect(
      listarEmpresasJunioresQuerySchema.safeParse({ federacaoId: "abc" })
        .success,
    ).toBe(false);
    expect(
      listarEmpresasJunioresQuerySchema.safeParse({ limit: 51 }).success,
    ).toBe(false);
  });
});
