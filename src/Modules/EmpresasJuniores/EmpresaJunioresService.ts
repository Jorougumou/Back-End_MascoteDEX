import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import type { EmpresaJuniorRepository } from "./EmpresaJunioresRepository";
import type {
  EmpresaJunioresDto,
  ListarEmpresasJunioresQuery,
  ListarEmpresasJunioresResponseDto,
} from "./EmpresaJunioresSchemas";

interface EmpresaJuniorServiceDeps {
  empresaJuniorRepository: EmpresaJuniorRepository;
}

export function createEmpresaJuniorService({
  empresaJuniorRepository,
}: EmpresaJuniorServiceDeps) {
  return {
    async listar(
      filtros: ListarEmpresasJunioresQuery,
    ): Promise<ListarEmpresasJunioresResponseDto> {
      const { dados, total } = await empresaJuniorRepository.listar(filtros);

      return {
        dados,
        paginacao: {
          total,
          page: filtros.page,
          limit: filtros.limit,
          totalPages: Math.ceil(total / filtros.limit),
        },
      };
    },

    async obterPorId(id: string): Promise<EmpresaJunioresDto> {
      const empresaJunior = await empresaJuniorRepository.buscarPorId(id);

      if (!empresaJunior) {
        throw new AppError(
          ErrorCodes.NAO_ENCONTRADO,
          404,
          "Empresa Júnior não encontrada.",
        );
      }

      return empresaJunior;
    },
  };
}

export type EmpresaJuniorService = ReturnType<typeof createEmpresaJuniorService>;