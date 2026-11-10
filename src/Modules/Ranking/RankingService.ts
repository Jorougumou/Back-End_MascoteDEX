import type { RankingRepository } from "./RankingRepository";
import type { GetRankingResponse } from "./RankingSchemas";

export class RankingService {
  constructor(private rankingRepository: RankingRepository) {}

  async execute(
    usuarioLogadoId: string,
    eventoId?: string,
  ): Promise<GetRankingResponse> {
    const rawRanking = await this.rankingRepository.getRanking(eventoId);

    // Mapeia adicionando a posição sequencial (1-indexed)
    const ranking = rawRanking.map((item, index) => ({
      posicao: index + 1,
      ...item,
    }));

    // Localiza o usuário atual na lista
    const me =
      ranking.find((item) => item.usuarioId === usuarioLogadoId) || null;

    return { ranking, me };
  }
}
