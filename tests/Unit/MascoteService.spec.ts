import { describe, expect, it } from "vitest";
import type {
  ListarGaleriaArgs,
  MascoteRepository,
} from "@/Modules/Mascotes/MascoteRepository";
import type { GaleriaQuery } from "@/Modules/Mascotes/MascoteSchemas";
import { createMascoteService } from "@/Modules/Mascotes/MascoteService";

function criarRepositorioFalso(total: number) {
  const chamadas: ListarGaleriaArgs[] = [];

  const repository: MascoteRepository = {
    async listarGaleria(args) {
      chamadas.push(args);
      return { itens: [], total };
    },
    async buscarPerfil() {
      return null;
    },
  };

  return { repository, chamadas };
}

function consulta(parcial: Partial<GaleriaQuery> = {}): GaleriaQuery {
  return { page: 1, limit: 20, minhaColecao: false, ...parcial };
}

describe("RF005 — galeria de mascotes", () => {
  it("converte page/limit em skip/take e repassa o usuário logado", async () => {
    const { repository, chamadas } = criarRepositorioFalso(45);
    const service = createMascoteService({ mascoteRepository: repository });

    await service.listarGaleria("usuario-1", consulta({ page: 3, limit: 20 }));

    expect(chamadas[0]).toMatchObject({
      usuarioId: "usuario-1",
      skip: 40,
      take: 20,
    });
  });

  it("calcula os metadados de paginação", async () => {
    const { repository } = criarRepositorioFalso(45);
    const service = createMascoteService({ mascoteRepository: repository });

    const resposta = await service.listarGaleria("usuario-1", consulta());

    expect(resposta.meta).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it("galeria vazia devolve lista vazia e total 0", async () => {
    const { repository } = criarRepositorioFalso(0);
    const service = createMascoteService({ mascoteRepository: repository });

    const resposta = await service.listarGaleria("usuario-1", consulta());

    expect(resposta.data).toEqual([]);
    expect(resposta.meta.total).toBe(0);
    expect(resposta.meta.totalPages).toBe(0);
  });
});

describe("RF006/RN013 — filtros da galeria no service", () => {
  it("sem filtros, repassa filtros vazios e minhaColecao desligada", async () => {
    const { repository, chamadas } = criarRepositorioFalso(0);
    const service = createMascoteService({ mascoteRepository: repository });

    await service.listarGaleria("usuario-1", consulta());

    expect(chamadas[0]?.filtros).toEqual({
      estado: undefined,
      federacaoId: undefined,
      empresaJuniorNormalizado: undefined,
      minhaColecao: false,
    });
  });

  it("normaliza o nome da EJ (sem acento, sem caixa, espaços colapsados)", async () => {
    const { repository, chamadas } = criarRepositorioFalso(0);
    const service = createMascoteService({ mascoteRepository: repository });

    await service.listarGaleria(
      "usuario-1",
      consulta({ empresaJunior: "  Júnior   CEARÁ " }),
    );

    expect(chamadas[0]?.filtros.empresaJuniorNormalizado).toBe("junior ceara");
  });

  it("repassa estado, federação e minhaColecao combinados", async () => {
    const { repository, chamadas } = criarRepositorioFalso(0);
    const service = createMascoteService({ mascoteRepository: repository });
    const federacaoId = crypto.randomUUID();

    await service.listarGaleria(
      "usuario-1",
      consulta({ estado: "SP", federacaoId, minhaColecao: true }),
    );

    expect(chamadas[0]?.filtros).toMatchObject({
      estado: "SP",
      federacaoId,
      minhaColecao: true,
    });
  });
});
