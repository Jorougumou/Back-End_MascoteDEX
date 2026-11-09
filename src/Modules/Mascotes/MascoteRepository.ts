import { Prisma, type PrismaClient } from "@prisma/client";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
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

export interface EventoDoMascoteRegistro {
  id: string;
  nome: string;
  local: string;
  dataInicio: Date;
  dataFim: Date;
}

export interface PerfilMascoteRegistro {
  id: string;
  nome: string;
  fotoUrl: string;
  capturado: boolean;
  empresaJunior: {
    id: string;
    nome: string;
    universidade: string;
    curiosidades: string | null;
    federacao: { nome: string; sigla: string; estado: string; regiao: string };
  };
  eventos: EventoDoMascoteRegistro[];
}

export interface EmpresaJuniorSugestao {
  id: string;
  nome: string;
  universidade: string;
  federacaoId: string;
}

export interface NovaEmpresaJuniorRegistro {
  nome: string;
  nomeNormalizado: string;
  universidade: string;
  curiosidades: string | null;
  federacaoId: string;
}

export type EmpresaJuniorDoCadastro =
  | { tipo: "existente"; id: string }
  | { tipo: "nova"; dados: NovaEmpresaJuniorRegistro };

export interface CadastrarComCapturaArgs {
  empresaJunior: EmpresaJuniorDoCadastro;
  mascote: {
    nome: string;
    nomeNormalizado: string;
    fotoUrl: string;
    usuarioId: string;
  };
  captura: { eventoId: string; capturadoEm: Date };
}

export interface MascoteRepository {
  listarGaleria(
    args: ListarGaleriaArgs,
  ): Promise<{ itens: MascoteGaleria[]; total: number }>;
  buscarPerfil(
    id: string,
    usuarioId: string,
  ): Promise<PerfilMascoteRegistro | null>;

  eventoExiste(id: string): Promise<boolean>;
  empresaJuniorExiste(id: string): Promise<boolean>;
  federacaoExiste(id: string): Promise<boolean>;
  buscarMascotePorNome(
    empresaJuniorId: string,
    nomeNormalizado: string,
  ): Promise<{ id: string } | null>;
  buscarEmpresaJuniorPorNome(
    federacaoId: string,
    nomeNormalizado: string,
  ): Promise<{ id: string } | null>;
  buscarEmpresasJunioresSimilares(
    nomeNormalizado: string,
    limite: number,
  ): Promise<EmpresaJuniorSugestao[]>;
  cadastrarComCaptura(
    args: CadastrarComCapturaArgs,
  ): Promise<{ mascoteId: string }>;
}

function violouUnicidade(erro: unknown): boolean {
  return (
    erro instanceof Prisma.PrismaClientKnownRequestError &&
    erro.code === "P2002"
  );
}

class MascoteDuplicadoNaTransacao extends Error {}

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
  function buscarMascotePorNome(
    empresaJuniorId: string,
    nomeNormalizado: string,
  ) {
    return prisma.mascote.findUnique({
      where: {
        empresaJuniorId_nomeNormalizado: { empresaJuniorId, nomeNormalizado },
      },
      select: { id: true },
    });
  }

  return {
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

    async buscarPerfil(id, usuarioId) {
      const mascote = await prisma.mascote.findUnique({
        where: { id },
        select: {
          id: true,
          nome: true,
          fotoUrl: true,
          capturas: {
            where: { usuarioId },
            select: { id: true },
            take: 1,
          },
          empresaJunior: {
            select: {
              id: true,
              nome: true,
              universidade: true,
              curiosidades: true,
              federacao: {
                select: { nome: true, sigla: true, estado: true, regiao: true },
              },
            },
          },
        },
      });

      if (!mascote) {
        return null;
      }

      const eventos = await prisma.evento.findMany({
        where: { capturas: { some: { mascoteId: id } } },
        orderBy: [{ dataInicio: "desc" }, { id: "asc" }],
        select: {
          id: true,
          nome: true,
          local: true,
          dataInicio: true,
          dataFim: true,
        },
      });

      const { capturas, ...dados } = mascote;

      return { ...dados, capturado: capturas.length > 0, eventos };
    },

    async eventoExiste(id) {
      const evento = await prisma.evento.findUnique({
        where: { id },
        select: { id: true },
      });
      return evento !== null;
    },

    async empresaJuniorExiste(id) {
      const empresaJunior = await prisma.empresaJunior.findUnique({
        where: { id },
        select: { id: true },
      });
      return empresaJunior !== null;
    },

    async federacaoExiste(id) {
      const federacao = await prisma.federacao.findUnique({
        where: { id },
        select: { id: true },
      });
      return federacao !== null;
    },

    buscarMascotePorNome,

    buscarEmpresaJuniorPorNome(federacaoId, nomeNormalizado) {
      return prisma.empresaJunior.findUnique({
        where: {
          federacaoId_nomeNormalizado: { federacaoId, nomeNormalizado },
        },
        select: { id: true },
      });
    },

    buscarEmpresasJunioresSimilares(nomeNormalizado, limite) {
      return prisma.empresaJunior.findMany({
        where: { nomeNormalizado: { contains: nomeNormalizado } },
        select: { id: true, nome: true, universidade: true, federacaoId: true },
        orderBy: [{ nome: "asc" }, { id: "asc" }],
        take: limite,
      });
    },

    async cadastrarComCaptura({ empresaJunior, mascote, captura }) {
      try {
        return await prisma.$transaction(async (tx) => {
          let empresaJuniorId: string;

          if (empresaJunior.tipo === "existente") {
            empresaJuniorId = empresaJunior.id;
          } else {
            try {
              const criada = await tx.empresaJunior.create({
                data: empresaJunior.dados,
                select: { id: true },
              });
              empresaJuniorId = criada.id;
            } catch (erro) {
              if (violouUnicidade(erro)) {
                throw new AppError(
                  ErrorCodes.EJ_DUPLICADA,
                  409,
                  "Já existe uma empresa júnior com esse nome nesta federação.",
                );
              }
              throw erro;
            }
          }

          try {
            const criado = await tx.mascote.create({
              data: {
                nome: mascote.nome,
                nomeNormalizado: mascote.nomeNormalizado,
                fotoUrl: mascote.fotoUrl,
                empresaJuniorId,
                usuarioId: mascote.usuarioId,
                capturas: {
                  create: {
                    usuarioId: mascote.usuarioId,
                    eventoId: captura.eventoId,
                    fotoUrl: mascote.fotoUrl,
                    capturadoEm: captura.capturadoEm,
                  },
                },
              },
              select: { id: true },
            });
            return { mascoteId: criado.id };
          } catch (erro) {
            if (violouUnicidade(erro)) throw new MascoteDuplicadoNaTransacao();
            throw erro;
          }
        });
      } catch (erro) {
        if (erro instanceof MascoteDuplicadoNaTransacao) {
          const existente =
            empresaJunior.tipo === "existente"
              ? await buscarMascotePorNome(
                  empresaJunior.id,
                  mascote.nomeNormalizado,
                )
              : null;
          throw new AppError(
            ErrorCodes.MASCOTE_JA_CADASTRADO,
            409,
            "Este mascote já está cadastrado nesta empresa júnior.",
            existente ? { mascoteId: existente.id } : null,
          );
        }
        if (
          erro instanceof Prisma.PrismaClientKnownRequestError &&
          erro.code === "P2003"
        ) {
          throw new AppError(
            ErrorCodes.NAO_AUTENTICADO,
            401,
            "Usuário do token não encontrado.",
          );
        }
        throw erro;
      }
    },
  };
}
