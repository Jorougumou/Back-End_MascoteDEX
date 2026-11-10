import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import { buildPaginationMeta, toSkipTake } from "@/Shared/Utils/Pagination";
import type { RankingRepository } from "./RankingRepository";
import type { RankingQuery, RankingResponse } from "./RankingSchemas";

interface RankingServiceDeps {
  rankingRepository: RankingRepository;
}

export type ListarRankingInput = Partial<Pick<RankingQuery, "eventoId">> &
  Pick<RankingQuery, "page" | "limit"> & { usuarioLogadoId: string };

export function createRankingService({
  rankingRepository,
}: RankingServiceDeps) {
  return {
    async listar({
      usuarioLogadoId,
      eventoId,
      page,
      limit,
    }: ListarRankingInput): Promise<RankingResponse> {
      if (eventoId !== undefined) {
        const existe = await rankingRepository.eventoExiste(eventoId);
        if (!existe) {
          throw new AppError(
            ErrorCodes.NAO_ENCONTRADO,
            404,
            "Evento não encontrado.",
          );
        }
      }

      const { itens, totalUsuarios, me } = await rankingRepository.listar({
        usuarioId: usuarioLogadoId,
        eventoId,
        ...toSkipTake(page, limit),
      });

      return {
        data: itens,
        meta: buildPaginationMeta(page, limit, totalUsuarios),
        me,
      };
    },
  };
}

export type RankingService = ReturnType<typeof createRankingService>;
