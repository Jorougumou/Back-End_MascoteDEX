import { describe, expect, it } from "vitest";
import type {
  ListarGaleriaArgs,
  MascoteRepository,
} from "@/Modules/Mascotes/MascoteRepository";
import { createMascoteService } from "@/Modules/Mascotes/MascoteService";

function criarRepositorioFalso(total: number) {
  const chamadas: ListarGaleriaArgs[] = [];

  const repository: MascoteRepository = {
    async listarGaleria(args) {
      chamadas.push(args);
      return { itens: [], total };
    },
  };

  return { repository, chamadas };
}

describe("RF005 — galeria de mascotes", () => {
  it("converte page/limit em skip/take e repassa o usuário logado", async () => {
    const { repository, chamadas } = criarRepositorioFalso(45);
    const service = createMascoteService({ mascoteRepository: repository });

    await service.listarGaleria("usuario-1", 3, 20);

    expect(chamadas[0]).toEqual({ usuarioId: "usuario-1", skip: 40, take: 20 });
  });

  it("calcula os metadados de paginação", async () => {
    const { repository } = criarRepositorioFalso(45);
    const service = createMascoteService({ mascoteRepository: repository });

    const resposta = await service.listarGaleria("usuario-1", 1, 20);

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

    const resposta = await service.listarGaleria("usuario-1", 1, 20);

    expect(resposta.data).toEqual([]);
    expect(resposta.meta.total).toBe(0);
    expect(resposta.meta.totalPages).toBe(0);
  });
});