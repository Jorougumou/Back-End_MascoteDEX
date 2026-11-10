import { Prisma, type PrismaClient } from "@prisma/client";

export interface LinhaRanking {
  posicao: number;
  usuarioId: string;
  nome: string;
  total: number;
}

export interface PosicaoUsuario {
  posicao: number;
  total: number;
}

export interface ConsultaRanking {
  usuarioId: string;
  eventoId?: string | undefined;
  skip: number;
  take: number;
}

export interface ResultadoRanking {
  itens: LinhaRanking[];
  totalUsuarios: number;
  me: PosicaoUsuario | null;
}

export interface RankingRepository {
  eventoExiste(eventoId: string): Promise<boolean>;
  listar(consulta: ConsultaRanking): Promise<ResultadoRanking>;
}

function cteRanking(eventoId?: string) {
  const filtroEvento =
    eventoId === undefined
      ? Prisma.empty
      : Prisma.sql`WHERE c.id_evento = ${eventoId}::uuid`;

  return Prisma.sql`
    WITH agregado AS (
      SELECT
        c.id_usuario AS "usuarioId",
        u.nome AS nome,
        COUNT(DISTINCT c.id_mascote)::int AS total,
        MAX(c.capturado_em) AS "ultimaCaptura"
      FROM captura c
      JOIN usuario u ON u.id_usuario = c.id_usuario
      ${filtroEvento}
      GROUP BY c.id_usuario, u.nome
    ),
    ranking AS (
      SELECT
        ROW_NUMBER() OVER (
          ORDER BY total DESC, "ultimaCaptura" ASC, "usuarioId" ASC
        )::int AS posicao,
        "usuarioId",
        nome,
        total
      FROM agregado
    )
  `;
}

export function createRankingRepository(
  prisma: PrismaClient,
): RankingRepository {
  return {
    async eventoExiste(eventoId) {
      const evento = await prisma.evento.findUnique({
        where: { id: eventoId },
        select: { id: true },
      });
      return evento !== null;
    },

    async listar({ usuarioId, eventoId, skip, take }) {
      const cte = cteRanking(eventoId);

      const [itens, contagem, me] = await prisma.$transaction([
        prisma.$queryRaw<LinhaRanking[]>`
          ${cte}
          SELECT posicao, "usuarioId", nome, total
          FROM ranking
          ORDER BY posicao
          LIMIT ${take} OFFSET ${skip}
        `,
        prisma.$queryRaw<Array<{ total: number }>>`
          ${cte}
          SELECT COUNT(*)::int AS total FROM ranking
        `,
        prisma.$queryRaw<PosicaoUsuario[]>`
          ${cte}
          SELECT posicao, total
          FROM ranking
          WHERE "usuarioId" = ${usuarioId}::uuid
        `,
      ]);

      return {
        itens,
        totalUsuarios: contagem[0]?.total ?? 0,
        me: me[0] ?? null,
      };
    },
  };
}
