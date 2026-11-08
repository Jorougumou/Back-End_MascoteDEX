import type { PrismaClient } from "@prisma/client";
import type { Federacao } from "./FederacaoSchemas";

export interface FederacaoRepository {
  listarTodas(filtro: { estado?: string | undefined }): Promise<Federacao[]>;
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
    listarTodas({ estado }) {
      return prisma.federacao.findMany({
        where: estado ? { estado } : {},
        select: selectFederacao,
        orderBy: [{ nome: "asc" }, { id: "asc" }],
      });
    },
  };
}
