import type { PrismaClient } from "@prisma/client";
import type { MascoteGaleria } from "./MascoteSchemas";

export interface ListarGaleriaArgs {
  usuarioId: string;
  skip: number;
  take: number;
}

export interface MascoteRepository {
  listarGaleria(
    args: ListarGaleriaArgs,
  ): Promise<{ itens: MascoteGaleria[]; total: number }>;
}

export function createMascoteRepository(
  prisma: PrismaClient,
): MascoteRepository {
  return {
    // RF005, RNF009: uma única consulta com join (sem N+1).
    async listarGaleria({ usuarioId, skip, take }) {
      const [registros, total] = await prisma.$transaction([
        prisma.mascote.findMany({
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
        prisma.mascote.count(),
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