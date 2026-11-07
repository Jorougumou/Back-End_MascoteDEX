import { normalizarTexto } from "@/Shared/Utils/Normalize";
import { buildPaginationMeta, toSkipTake } from "@/Shared/Utils/Pagination";
import type { MascoteRepository } from "./MascoteRepository";
import type { GaleriaQuery } from "./MascoteSchemas";

interface MascoteServiceDeps {
  mascoteRepository: MascoteRepository;
}

export function createMascoteService({
  mascoteRepository,
}: MascoteServiceDeps) {
  return {
    // RF005, RF006: galeria paginada, com filtros combináveis (RN013),
    // indicando os mascotes já capturados pelo usuário
    async listarGaleria(usuarioId: string, consulta: GaleriaQuery) {
      const { page, limit, estado, federacaoId, empresaJunior, minhaColecao } =
        consulta;

      const { itens, total } = await mascoteRepository.listarGaleria({
        usuarioId,
        ...toSkipTake(page, limit),
        filtros: {
          estado,
          federacaoId,
          minhaColecao,
          // RN013: busca por nome sem acento e sem diferenciar maiúsculas
          empresaJuniorNormalizado: empresaJunior
            ? normalizarTexto(empresaJunior) || undefined
            : undefined,
        },
      });

      return { data: itens, meta: buildPaginationMeta(page, limit, total) };
    },
  };
}

export type MascoteService = ReturnType<typeof createMascoteService>;
