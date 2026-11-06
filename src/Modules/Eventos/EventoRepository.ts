import { Prisma, type PrismaClient } from "@prisma/client";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";

export interface EventoRegistro {
  id: string;
  nome: string;
  local: string;
  dataInicio: Date;
  dataFim: Date;
  criadoEm: Date;
}

export interface NovoEvento {
  nome: string;
  local: string;
  dataInicio: Date;
  dataFim: Date;
  usuarioId: string;
}

export interface EventoRepository {
  criar(dados: NovoEvento): Promise<EventoRegistro>;
  listar(janela: {
    skip: number;
    take: number;
  }): Promise<{ itens: EventoRegistro[]; total: number }>;
}

const selectEvento = {
  id: true,
  nome: true,
  local: true,
  dataInicio: true,
  dataFim: true,
  criadoEm: true,
} as const;

export function createEventoRepository(prisma: PrismaClient): EventoRepository {
  return {
    async criar(dados) {
      try {
        return await prisma.evento.create({
          data: dados,
          select: selectEvento,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2003"
        ) {
          throw new AppError(
            ErrorCodes.NAO_AUTENTICADO,
            401,
            "Usuário do token não encontrado.",
          );
        }
        throw error;
      }
    },

    async listar({ skip, take }) {
      const [itens, total] = await prisma.$transaction([
        prisma.evento.findMany({
          orderBy: [
            { dataInicio: "desc" },
            { criadoEm: "desc" },
            { id: "asc" },
          ],
          skip,
          take,
          select: selectEvento,
        }),
        prisma.evento.count(),
      ]);

      return { itens, total };
    },
  };
}
