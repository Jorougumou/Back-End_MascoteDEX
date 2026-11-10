import type { PrismaClient } from "@prisma/client";

export interface RankingRow {
  usuarioId: string;
  nome: string;
  totalMascotes: number;
  ultimaCapturaEm: Date;
}

export class RankingRepository {
  constructor(private prisma: PrismaClient) {}

  async getRanking(eventoId?: string): Promise<RankingRow[]> {
    // 1. Agrupa as capturas por usuário e conta os mascotes distintos usando a API nativa do Prisma
    const groupedCapturas = await this.prisma.captura.groupBy({
      by: ["usuarioId"],
      where: eventoId ? { eventoId } : undefined,
      _count: {
        mascoteId: true,
      },
      _max: {
        capturadoEm: true,
      },
    });

    if (groupedCapturas.length === 0) {
      return [];
    }

    // 2. Busca os nomes dos usuários correspondentes
    const usuarioIds = groupedCapturas.map((g) => g.usuarioId);
    const usuarios = await this.prisma.usuario.findMany({
      where: { id: { in: usuarioIds } },
      select: { id: true, nome: true },
    });

    const usuarioMap = new Map(usuarios.map((u) => [u.id, u.nome]));

    // 3. Monta e ordena o ranking (maior total de mascotes primeiro, depois menor data de última captura)
    const ranking: RankingRow[] = groupedCapturas.map((item) => ({
      usuarioId: item.usuarioId,
      nome: usuarioMap.get(item.usuarioId) ?? "Usuário Desconhecido",
      totalMascotes: item._count.mascoteId,
      ultimaCapturaEm: item._max.capturadoEm ?? new Date(0),
    }));

    ranking.sort((a, b) => {
      if (b.totalMascotes !== a.totalMascotes) {
        return b.totalMascotes - a.totalMascotes;
      }
      return a.ultimaCapturaEm.getTime() - b.ultimaCapturaEm.getTime();
    });

    return ranking;
  }
}
