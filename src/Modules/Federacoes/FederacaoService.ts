import type { PaginationMeta } from "@/Shared/Schemas/Common";
import { normalizarTexto } from "@/Shared/Utils/Normalize";
import { buildPaginationMeta } from "@/Shared/Utils/Pagination";
import type { FederacaoRepository } from "./FederacaoRepository";
import type { Federacao, ListarFederacoesQuery } from "./FederacaoSchemas";

interface FederacaoServiceDeps {
  federacaoRepository: FederacaoRepository;
}

export function createFederacaoService({
  federacaoRepository,
}: FederacaoServiceDeps) {
  return {
    async listar({ q, estado, page, limit }: ListarFederacoesQuery): Promise<{
      data: Federacao[];
      meta: PaginationMeta;
    }> {
      const todas = await federacaoRepository.listarTodas({ estado });

      const termo = q ? normalizarTexto(q) : null;
      const filtradas = termo
        ? todas.filter((federacao) =>
            normalizarTexto(`${federacao.nome} ${federacao.sigla}`).includes(
              termo,
            ),
          )
        : todas;

      const inicio = (page - 1) * limit;

      return {
        data: filtradas.slice(inicio, inicio + limit),
        meta: buildPaginationMeta(page, limit, filtradas.length),
      };
    },
  };
}

export type FederacaoService = ReturnType<typeof createFederacaoService>;
