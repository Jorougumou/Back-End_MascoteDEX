import type { PaginationMeta, PaginationQuery } from "@/Shared/Schemas/Common";
import { buildPaginationMeta, toSkipTake } from "@/Shared/Utils/Pagination";
import type { EventoRegistro, EventoRepository } from "./EventoRepository";
import type { CriarEventoBody, Evento } from "./EventoSchemas";

interface EventoServiceDeps {
  eventoRepository: EventoRepository;
}

function paraEvento(registro: EventoRegistro): Evento {
  return {
    id: registro.id,
    nome: registro.nome,
    local: registro.local,
    dataInicio: registro.dataInicio.toISOString().slice(0, 10),
    dataFim: registro.dataFim.toISOString().slice(0, 10),
    criadoEm: registro.criadoEm.toISOString(),
  };
}

function paraData(dia: string) {
  return new Date(`${dia}T00:00:00.000Z`);
}

export function createEventoService({ eventoRepository }: EventoServiceDeps) {
  return {
    async criar(dados: CriarEventoBody, usuarioId: string): Promise<Evento> {
      const registro = await eventoRepository.criar({
        nome: dados.nome,
        local: dados.local,
        dataInicio: paraData(dados.dataInicio),
        dataFim: paraData(dados.dataFim),
        usuarioId,
      });

      return paraEvento(registro);
    },

    async listar({ page, limit }: PaginationQuery): Promise<{
      data: Evento[];
      meta: PaginationMeta;
    }> {
      const { itens, total } = await eventoRepository.listar(
        toSkipTake(page, limit),
      );

      return {
        data: itens.map(paraEvento),
        meta: buildPaginationMeta(page, limit, total),
      };
    },
  };
}

export type EventoService = ReturnType<typeof createEventoService>;
