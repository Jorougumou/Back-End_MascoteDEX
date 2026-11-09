import type { Prisma, PrismaClient } from "@prisma/client";
import type { EmpresaJunior } from "./EmpresaJuniorSchemas";

export interface FiltroEmpresasJuniores {
  termoNormalizado?: string | undefined;
  federacaoId?: string | undefined;
  skip: number;
  take: number;
}

export interface EmpresaJuniorRepository {
  listar(
    filtro: FiltroEmpresasJuniores,
  ): Promise<{ itens: EmpresaJunior[]; total: number }>;
}

const selectEmpresaJunior = {
  id: true,
  nome: true,
  universidade: true,
  curiosidades: true,
  federacaoId: true,
} as const;

export function createEmpresaJuniorRepository(
  prisma: PrismaClient,
): EmpresaJuniorRepository {
  return {
    async listar({ termoNormalizado, federacaoId, skip, take }) {
      const where: Prisma.EmpresaJuniorWhereInput = {
        ...(federacaoId ? { federacaoId } : {}),
        ...(termoNormalizado
          ? {
              OR: [
                { nomeNormalizado: { contains: termoNormalizado } },
                {
                  universidade: {
                    contains: termoNormalizado,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      };

      const [itens, total] = await prisma.$transaction([
        prisma.empresaJunior.findMany({
          where,
          select: selectEmpresaJunior,
          orderBy: [{ nome: "asc" }, { id: "asc" }],
          skip,
          take,
        }),
        prisma.empresaJunior.count({ where }),
      ]);

      return { itens, total };
    },
  };
}
