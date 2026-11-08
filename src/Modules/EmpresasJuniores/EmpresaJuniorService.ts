import type { PaginationMeta } from "@/Shared/Schemas/Common";
import { normalizarTexto } from "@/Shared/Utils/Normalize";
import { buildPaginationMeta, toSkipTake } from "@/Shared/Utils/Pagination";
import type { EmpresaJuniorRepository } from "./EmpresaJuniorRepository";
import type {
  EmpresaJunior,
  ListarEmpresasJunioresQuery,
} from "./EmpresaJuniorSchemas";

interface EmpresaJuniorServiceDeps {
  empresaJuniorRepository: EmpresaJuniorRepository;
}

export function createEmpresaJuniorService({
  empresaJuniorRepository,
}: EmpresaJuniorServiceDeps) {
  return {
    async listar({
      q,
      federacaoId,
      page,
      limit,
    }: ListarEmpresasJunioresQuery): Promise<{
      data: EmpresaJunior[];
      meta: PaginationMeta;
    }> {
      const termoNormalizado = q ? normalizarTexto(q) : undefined;

      const { itens, total } = await empresaJuniorRepository.listar({
        termoNormalizado,
        federacaoId,
        ...toSkipTake(page, limit),
      });

      return {
        data: itens,
        meta: buildPaginationMeta(page, limit, total),
      };
    },
  };
}

export type EmpresaJuniorService = ReturnType<
  typeof createEmpresaJuniorService
>;
