import { Prisma, type PrismaClient } from "@prisma/client";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";

export interface CapturaRegistro {
  id: string;
  mascoteId: string;
  eventoId: string;
  fotoUrl: string;
  capturadoEm: Date;
  sincronizadoEm: Date;
}

export interface NovaCaptura {
  usuarioId: string;
  mascoteId: string;
  eventoId: string;
  fotoUrl: string;
  capturadoEm: Date;
}

export interface CapturaRepository {
  mascoteExiste(id: string): Promise<boolean>;
  eventoExiste(id: string): Promise<boolean>;

  buscarDuplicada(
    usuarioId: string,
    mascoteId: string,
    eventoId: string,
  ): Promise<boolean>;

  criar(dados: NovaCaptura): Promise<CapturaRegistro>;
}

function ehCodigoPrisma(erro: unknown, codigo: string): boolean {
  return (
    erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === codigo
  );
}

export function createCapturaRepository(
  prisma: PrismaClient,
): CapturaRepository {
  return {
    async mascoteExiste(id) {
      const mascote = await prisma.mascote.findUnique({
        where: { id },
        select: { id: true },
      });

      return mascote !== null;
    },

    async eventoExiste(id) {
      const evento = await prisma.evento.findUnique({
        where: { id },
        select: { id: true },
      });

      return evento !== null;
    },

    async buscarDuplicada(usuarioId, mascoteId, eventoId) {
      const captura = await prisma.captura.findUnique({
        where: {
          usuarioId_mascoteId_eventoId: {
            usuarioId,
            mascoteId,
            eventoId,
          },
        },
        select: { id: true },
      });

      return captura !== null;
    },

    async criar(dados) {
      try {
        return await prisma.captura.create({
          data: dados,
          select: {
            id: true,
            mascoteId: true,
            eventoId: true,
            fotoUrl: true,
            capturadoEm: true,
            sincronizadoEm: true,
          },
        });
      } catch (erro) {
        if (ehCodigoPrisma(erro, "P2002")) {
          throw new AppError(
            ErrorCodes.CAPTURA_DUPLICADA,
            409,
            "Você já registrou a captura deste mascote neste evento.",
          );
        }

        if (ehCodigoPrisma(erro, "P2003")) {
          throw new AppError(
            ErrorCodes.NAO_AUTENTICADO,
            401,
            "Usuário do token não encontrado.",
          );
        }

        if (ehCodigoPrisma(erro, "P2025")) {
          throw new AppError(
            ErrorCodes.NAO_ENCONTRADO,
            404,
            "Mascote ou evento não encontrado.",
          );
        }

        throw erro;
      }
    },
  };
}
