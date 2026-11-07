import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import { normalizarTexto } from "@/Shared/Utils/Normalize";
import { buildPaginationMeta, toSkipTake } from "@/Shared/Utils/Pagination";
import type { MascoteRepository } from "./MascoteRepository";
import type { GaleriaQuery, MascotePerfil } from "./MascoteSchemas";

interface MascoteServiceDeps {
  mascoteRepository: MascoteRepository;
}

export function createMascoteService({
  mascoteRepository,
}: MascoteServiceDeps) {
  return {
    // RF005, RF006: galeria paginada, com filtros combináveis (RN013),
    // indicando os mascotes já capturados pelo usuário
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
          // RN013: busca por nome sem acento e sem diferenciar maiúsculas
          empresaJuniorNormalizado: empresaJunior
            ? normalizarTexto(empresaJunior) || undefined
            : undefined,
        },
      });

      return { data: itens, meta: buildPaginationMeta(page, limit, total) };
    },

    // RF007, RN017, UC-07: perfil completo do mascote, com os eventos (e datas)
    // em que foi capturado. FA01: mascote inexistente.
    async buscarPerfil(id: string): Promise<MascotePerfil> {
      const registro = await mascoteRepository.buscarPerfil(id);

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
    },
  };
}

export type MascoteService = ReturnType<typeof createMascoteService>;