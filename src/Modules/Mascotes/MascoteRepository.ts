import type { Prisma, PrismaClient } from "@prisma/client";
import type { MascoteGaleria } from "./MascoteSchemas";

export interface FiltrosGaleria {
  estado?: string;
  federacaoId?: string;
  empresaJuniorNormalizado?: string;
  minhaColecao: boolean;
}

export interface ListarGaleriaArgs {
  usuarioId: string;
  skip: number;
  take: number;
  filtros: FiltrosGaleria;
}

export interface MascoteRepository {
  listarGaleria(
    args: ListarGaleriaArgs,
  ): Promise<{ itens: MascoteGaleria[]; total: number }>;
}

// RN013: filtros combinados com AND. Só entra no where o que foi informado.
export function montarWhereGaleria(
  usuarioId: string,
  filtros: FiltrosGaleria,
): Prisma.MascoteWhereInput {
  const empresaJunior: Prisma.EmpresaJuniorWhereInput = {};

  if (filtros.federacaoId) {
    empresaJunior.federacaoId = filtros.federacaoId;
  }
  if (filtros.estado) {
    empresaJunior.federacao = { estado: filtros.estado };
  }
  if (filtros.empresaJuniorNormalizado) {
    // nomeNormalizado já está sem acento e em minúsculas (busca parcial).
    empresaJunior.nomeNormalizado = {
      contains: filtros.empresaJuniorNormalizado,
    };
  }

  const where: Prisma.MascoteWhereInput = {};

  if (Object.keys(empresaJunior).length > 0) {
    where.empresaJunior = empresaJunior;
  }
  if (filtros.minhaColecao) {
    where.capturas = { some: { usuarioId } };
  }

  return where;
}

export function createMascoteRepository(
  prisma: PrismaClient,
): MascoteRepository {
  return {
    // RF005, RF006, RNF009: uma única consulta com join (sem N+1).
    async listarGaleria({ usuarioId, skip, take, filtros }) {
      const where = montarWhereGaleria(usuarioId, filtros);

      const [registros, total] = await prisma.$transaction([
        prisma.mascote.findMany({
          where,
          skip,
          take,
          orderBy: [{ criadoEm: "desc" }, { id: "asc" }],
          select: {
            id: true,
            nome: true,
            fotoUrl: true,
            empresaJunior: {
              select: {
                id: true,
                nome: true,
                federacao: {
                  select: { nome: true, sigla: true, estado: true },
                },
              },
            },
            // Só as capturas do usuário logado; basta saber se existe uma.
            capturas: {
              where: { usuarioId },
              select: { id: true },
              take: 1,
            },
          },
        }),
        // O total usa o mesmo where, para a paginação refletir os filtros.
        prisma.mascote.count({ where }),
      ]);

      const itens = registros.map((mascote) => ({
        id: mascote.id,
        nome: mascote.nome,
        fotoUrl: mascote.fotoUrl,
        empresaJunior: {
          id: mascote.empresaJunior.id,
          nome: mascote.empresaJunior.nome,
        },
        federacao: mascote.empresaJunior.federacao,
        capturado: mascote.capturas.length > 0,
      }));

      return { itens, total };
    },
  };
}
