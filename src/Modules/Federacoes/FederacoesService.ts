import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import type { FederacaoRepository } from "./FederacoesRepository";
import type {
  FederacaoDto,
  ListarFederacoesQuery,
  ListarFederacoesResponseDto,
} from "./FederacoesSchemas";

interface FederacaoServiceDeps {
  federacaoRepository: FederacaoRepository;
}

export function createFederacaoService({
  federacaoRepository,
}: FederacaoServiceDeps) {
  return {
    async listar(
      filtros: ListarFederacoesQuery,
    ): Promise<ListarFederacoesResponseDto> {
      const { dados, total } = await federacaoRepository.listar(filtros);

      return {
        dados,
        paginacao: {
          total,
          page: filtros.page,
          limit: filtros.limit,
          totalPages: Math.ceil(total / filtros.limit),
        },
      };
    },

    async obterPorId(id: string): Promise<FederacaoDto> {
      const federacao = await federacaoRepository.buscarPorId(id);

      if (!federacao) {
        throw new AppError(
          ErrorCodes.NAO_ENCONTRADO,
          404,
          "Federação não encontrada.",
        );
      }

      return federacao;
    },
  };
}

export type FederacaoService = ReturnType<typeof createFederacaoService>;