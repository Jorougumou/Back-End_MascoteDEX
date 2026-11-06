import { buildPaginationMeta, toSkipTake } from "@/Shared/Utils/Pagination";
import type { MascoteRepository } from "./MascoteRepository";

interface MascoteServiceDeps {
  mascoteRepository: MascoteRepository;
}

export function createMascoteService({
  mascoteRepository,
}: MascoteServiceDeps) {
  return {
    // RF005: galeria paginada, indicando os mascotes já capturados pelo usuário
    async listarGaleria(usuarioId: string, page: number, limit: number) {
      const { itens, total } = await mascoteRepository.listarGaleria({
        usuarioId,
        ...toSkipTake(page, limit),
      });

      return { data: itens, meta: buildPaginationMeta(page, limit, total) };
    },
  };
}

export type MascoteService = ReturnType<typeof createMascoteService>;