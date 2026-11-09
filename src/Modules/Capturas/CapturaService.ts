import type { StorageProvider } from "@/Infra/Storage/StorageProvider";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import {
  gerarNomeArquivo,
  validarImagem,
} from "@/Shared/Utils/ImageValidation";
import type { Logger } from "@/Shared/Utils/Logger";
import type { CriarCapturaCampos, Captura } from "./CapturaSchemas";
import type { CapturaRepository } from "./CapturaRepository";

const TOLERANCIA_RELOGIO_MS = 5 * 60 * 1000;

interface CapturaServiceDeps {
  capturaRepository: CapturaRepository;
  storage: StorageProvider;
  logger: Logger;
  agora?: () => Date;
}

export interface RegistrarCapturaEntrada {
  usuarioId: string;
  mascoteId: string;
  foto: Buffer;
  dados: CriarCapturaCampos;
}

export function createCapturaService({
  capturaRepository,
  storage,
  logger,
  agora = () => new Date(),
}: CapturaServiceDeps) {
  async function removerFotoOrfa(url: string): Promise<void> {
    try {
      await storage.remove(url);
    } catch (erro) {
      logger.error(
        { err: erro, fotoUrl: url },
        "RN015: falha ao remover foto órfã após erro ao registrar captura",
      );
    }
  }

  return {
    async registrar({
      usuarioId,
      mascoteId,
      foto,
      dados,
    }: RegistrarCapturaEntrada): Promise<Captura> {
      const imagem = validarImagem(foto);

      if (!(await capturaRepository.mascoteExiste(mascoteId))) {
        throw new AppError(
          ErrorCodes.NAO_ENCONTRADO,
          404,
          "Mascote não encontrado.",
        );
      }

      if (!(await capturaRepository.eventoExiste(dados.eventoId))) {
        throw new AppError(
          ErrorCodes.NAO_ENCONTRADO,
          404,
          "Evento não encontrado.",
        );
      }

      if (
        await capturaRepository.buscarDuplicada(
          usuarioId,
          mascoteId,
          dados.eventoId,
        )
      ) {
        throw new AppError(
          ErrorCodes.CAPTURA_DUPLICADA,
          409,
          "Você já registrou a captura deste mascote neste evento.",
        );
      }

      const momentoAtual = agora();
      const capturadoEm = dados.capturadoEm ?? momentoAtual;

      if (
        capturadoEm.getTime() >
        momentoAtual.getTime() + TOLERANCIA_RELOGIO_MS
      ) {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          400,
          "capturadoEm não pode estar mais de 5 minutos no futuro.",
          [
            {
              local: "body",
              campo: "capturadoEm",
              mensagem: "data futura",
            },
          ],
        );
      }

      const caminho = `capturas/${dados.eventoId}/${gerarNomeArquivo(
        imagem.extensao,
      )}`;

      const fotoUrl = await storage.upload(foto, imagem.mime, caminho);

      try {
        const registro = await capturaRepository.criar({
          usuarioId,
          mascoteId,
          eventoId: dados.eventoId,
          fotoUrl,
          capturadoEm,
        });

        return {
          id: registro.id,
          mascoteId: registro.mascoteId,
          eventoId: registro.eventoId,
          fotoUrl: registro.fotoUrl,
          capturadoEm: registro.capturadoEm.toISOString(),
          sincronizadoEm: registro.sincronizadoEm.toISOString(),
        };
      } catch (erro) {
        await removerFotoOrfa(fotoUrl);
        throw erro;
      }
    },
  };
}

export type CapturaService = ReturnType<typeof createCapturaService>;
