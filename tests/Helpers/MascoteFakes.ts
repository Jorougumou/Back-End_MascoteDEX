import type { StorageProvider } from "@/Infra/Storage/StorageProvider";
import type { MascoteRepository } from "@/Modules/Mascotes/MascoteRepository";
import { createMascoteService } from "@/Modules/Mascotes/MascoteService";
import { loggerNulo } from "@/Shared/Utils/Logger";

const naoEsperado = async (): Promise<never> => {
  throw new Error("Método não esperado neste teste.");
};

export function repositorioBase(
  parcial: Partial<MascoteRepository> = {},
): MascoteRepository {
  return {
    listarGaleria: naoEsperado,
    buscarPerfil: naoEsperado,
    eventoExiste: naoEsperado,
    empresaJuniorExiste: naoEsperado,
    federacaoExiste: naoEsperado,
    buscarMascotePorNome: naoEsperado,
    buscarEmpresaJuniorPorNome: naoEsperado,
    buscarEmpresasJunioresSimilares: naoEsperado,
    cadastrarComCaptura: naoEsperado,
    ...parcial,
  };
}

export const storageNaoEsperado: StorageProvider = {
  upload: naoEsperado,
  remove: naoEsperado,
};

export function criarServicoDeLeitura(mascoteRepository: MascoteRepository) {
  return createMascoteService({
    mascoteRepository,
    storage: storageNaoEsperado,
    logger: loggerNulo,
  });
}
