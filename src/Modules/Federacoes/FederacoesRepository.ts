import { type Prisma, type PrismaClient } from "@prisma/client";
import type {
  FederacaoDto,
  ListarFederacoesQuery,
} from "./FederacoesSchemas";

export interface FederacaoRepository {
  buscarPorId(id: string): Promise<FederacaoDto | null>;
  listar(
    filtros: ListarFederacoesQuery,
  ): Promise<{ dados: FederacaoDto[]; total: number }>;
}

const selectFederacao = {
  id: true,
  nome: true,
  sigla: true,
  estado: true,
  regiao: true,
} as const;

export function createFederacaoRepository(
  prisma: PrismaClient,
): FederacaoRepository {
  return {
    buscarPorId(id) {
      return prisma.federacao.findUnique({
        where: { id },
        select: selectFederacao,
      });
    },

    async listar({ busca, page, limit }) {
      const where: Prisma.FederacaoWhereInput = busca
        ? {
            OR: [
              { nome: { contains: busca, mode: "insensitive" } },
              { sigla: { contains: busca, mode: "insensitive" } },
              { estado: { contains: busca, mode: "insensitive" } },
              { regiao: { contains: busca, mode: "insensitive" } },
            ],
          }
        : {};

      const skip = (page - 1) * limit;

      const [dados, total] = await prisma.$transaction([
        prisma.federacao.findMany({
          where,
          select: selectFederacao,
          orderBy: { nome: "asc" },
          skip,
          take: limit,
        }),
        prisma.federacao.count({ where }),
      ]);

      return { dados, total };
    },
  };
}