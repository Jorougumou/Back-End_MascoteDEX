import type { StorageProvider } from "@/Infra/Storage/StorageProvider";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import {
  gerarNomeArquivo,
  validarImagem,
} from "@/Shared/Utils/ImageValidation";
import type { Logger } from "@/Shared/Utils/Logger";
import { normalizarTexto } from "@/Shared/Utils/Normalize";
import { buildPaginationMeta, toSkipTake } from "@/Shared/Utils/Pagination";
import type {
  EmpresaJuniorDoCadastro,
  MascoteRepository,
} from "./MascoteRepository";
import type {
  CadastrarMascoteCampos,
  EmpresaJuniorEscolhida,
  GaleriaQuery,
  MascotePerfil,
} from "./MascoteSchemas";

const LIMITE_SUGESTOES = 10;

interface MascoteServiceDeps {
  mascoteRepository: MascoteRepository;
  storage: StorageProvider;
  logger: Logger;
  agora?: () => Date;
}

export interface CadastrarMascoteEntrada {
  usuarioId: string;
  foto: Buffer;
  dados: CadastrarMascoteCampos;
}

export function createMascoteService({
  mascoteRepository,
  storage,
  logger,
  agora = () => new Date(),
}: MascoteServiceDeps) {
  async function buscarPerfil(
    id: string,
    usuarioId: string,
  ): Promise<MascotePerfil> {
    const registro = await mascoteRepository.buscarPerfil(id, usuarioId);

    if (!registro) {
      throw new AppError(
        ErrorCodes.NAO_ENCONTRADO,
        404,
        "Mascote não encontrado.",
      );
    }

    const { federacao, ...empresaJunior } = registro.empresaJunior;

    return {
      id: registro.id,
      nome: registro.nome,
      fotoUrl: registro.fotoUrl,
      capturado: registro.capturado,
      empresaJunior,
      federacao,
      eventos: registro.eventos.map((evento) => ({
        id: evento.id,
        nome: evento.nome,
        local: evento.local,
        dataInicio: evento.dataInicio.toISOString().slice(0, 10),
        dataFim: evento.dataFim.toISOString().slice(0, 10),
      })),
    };
  }

  async function resolverEmpresaJunior(
    escolhida: EmpresaJuniorEscolhida,
    nomeMascoteNormalizado: string,
  ): Promise<EmpresaJuniorDoCadastro> {
    if (escolhida.tipo === "existente") {
      if (!(await mascoteRepository.empresaJuniorExiste(escolhida.id))) {
        throw new AppError(
          ErrorCodes.NAO_ENCONTRADO,
          404,
          "Empresa júnior não encontrada.",
        );
      }

      const existente = await mascoteRepository.buscarMascotePorNome(
        escolhida.id,
        nomeMascoteNormalizado,
      );
      if (existente) {
        throw new AppError(
          ErrorCodes.MASCOTE_JA_CADASTRADO,
          409,
          "Este mascote já está cadastrado nesta empresa júnior. Registre uma captura.",
          { mascoteId: existente.id },
        );
      }

      return { tipo: "existente", id: escolhida.id };
    }

    if (!(await mascoteRepository.federacaoExiste(escolhida.federacaoId))) {
      throw new AppError(
        ErrorCodes.NAO_ENCONTRADO,
        404,
        "Federação não encontrada.",
      );
    }

    const nomeEjNormalizado = normalizarTexto(escolhida.nome);

    const duplicada = await mascoteRepository.buscarEmpresaJuniorPorNome(
      escolhida.federacaoId,
      nomeEjNormalizado,
    );
    if (duplicada) {
      throw new AppError(
        ErrorCodes.EJ_DUPLICADA,
        409,
        "Já existe uma empresa júnior com esse nome nesta federação.",
        { empresaJuniorId: duplicada.id },
      );
    }

    if (!escolhida.confirmarSimilares) {
      const sugestoes = await mascoteRepository.buscarEmpresasJunioresSimilares(
        nomeEjNormalizado,
        LIMITE_SUGESTOES,
      );
      if (sugestoes.length > 0) {
        throw new AppError(
          ErrorCodes.EJ_SIMILARES_ENCONTRADAS,
          409,
          "Encontramos empresas juniores com nome parecido. Use uma delas ou confirme a criação de uma nova.",
          { sugestoes },
        );
      }
    }

    return {
      tipo: "nova",
      dados: {
        nome: escolhida.nome,
        nomeNormalizado: nomeEjNormalizado,
        universidade: escolhida.universidade,
        curiosidades: escolhida.curiosidades ?? null,
        federacaoId: escolhida.federacaoId,
      },
    };
  }

  async function removerFotoOrfa(url: string) {
    try {
      await storage.remove(url);
    } catch (erro) {
      logger.error(
        { err: erro, fotoUrl: url },
        "RN015: falha ao remover foto órfã após erro no banco",
      );
    }
  }

  return {
    async listarGaleria(usuarioId: string, consulta: GaleriaQuery) {
      const { page, limit, estado, federacaoId, empresaJunior, minhaColecao } =
        consulta;

      const { itens, total } = await mascoteRepository.listarGaleria({
        usuarioId,
        ...toSkipTake(page, limit),
        filtros: {
          estado,
          federacaoId,
          minhaColecao,
          empresaJuniorNormalizado: empresaJunior
            ? normalizarTexto(empresaJunior) || undefined
            : undefined,
        },
      });

      return { data: itens, meta: buildPaginationMeta(page, limit, total) };
    },

    buscarPerfil,

    async cadastrar({
      usuarioId,
      foto,
      dados,
    }: CadastrarMascoteEntrada): Promise<MascotePerfil> {
      const imagem = validarImagem(foto);

      if (!(await mascoteRepository.eventoExiste(dados.eventoId))) {
        throw new AppError(
          ErrorCodes.NAO_ENCONTRADO,
          404,
          "Evento não encontrado.",
        );
      }

      const nomeNormalizado = normalizarTexto(dados.nome);
      const empresaJunior = await resolverEmpresaJunior(
        dados.empresaJunior,
        nomeNormalizado,
      );

      const caminho = `mascotes/${gerarNomeArquivo(imagem.extensao)}`;
      const fotoUrl = await storage.upload(foto, imagem.mime, caminho);

      let mascoteId: string;
      try {
        ({ mascoteId } = await mascoteRepository.cadastrarComCaptura({
          empresaJunior,
          mascote: {
            nome: dados.nome,
            nomeNormalizado,
            fotoUrl,
            usuarioId,
          },
          captura: {
            eventoId: dados.eventoId,
            capturadoEm: dados.capturadoEm ?? agora(),
          },
        }));
      } catch (erro) {
        await removerFotoOrfa(fotoUrl);
        throw erro;
      }

      return buscarPerfil(mascoteId, usuarioId);
    },
  };
}

export type MascoteService = ReturnType<typeof createMascoteService>;
