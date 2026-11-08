import { type Prisma, type PrismaClient } from "@prisma/client";
import type {
  EmpresaJunioresDto,
  ListarEmpresasJunioresQuery,
} from "./EmpresaJunioresSchemas";

export interface EmpresaJuniorRepository {
  buscarPorId(id: string): Promise<EmpresaJunioresDto | null>;
  listar(
    filtros: ListarEmpresasJunioresQuery,
  ): Promise<{ dados: EmpresaJunioresDto[]; total: number }>;
}

const selectEmpresaJunior = {
  id: true,
  nome: true,
  nomeNormalizado: true,
  universidade: true,
  curiosidades: true,
  federacaoId: true,
} as const;

export function createEmpresaJuniorRepository(
  prisma: PrismaClient,
): EmpresaJuniorRepository {
  return {
    buscarPorId(id) {
      return prisma.empresaJunior.findUnique({
        where: { id },
        select: selectEmpresaJunior,
      });
    },

    async listar({ busca, page, limit }) {
      const where: Prisma.EmpresaJuniorWhereInput = busca
        ? {
            OR: [
              { nome: { contains: busca, mode: "insensitive" } },
              { nomeNormalizado: { contains: busca, mode: "insensitive" } },
              { universidade: { contains: busca, mode: "insensitive" } },
            ],
          }
        : {};

      const skip = (page - 1) * limit;

      const [dados, total] = await prisma.$transaction([
        prisma.empresaJunior.findMany({
          where,
          select: selectEmpresaJunior,
          orderBy: { nome: "asc" },
          skip,
          take: limit,
        }),
        prisma.empresaJunior.count({ where }),
      ]);

      return { dados, total };
    },
  };
}