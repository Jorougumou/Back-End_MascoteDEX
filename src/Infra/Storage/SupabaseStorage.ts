import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import type { StorageProvider } from "./StorageProvider";

interface ErroSupabase {
  message: string;
}

export interface SupabaseBucket {
  upload(
    caminho: string,
    arquivo: Buffer,
    opcoes: { contentType: string; upsert: boolean },
  ): Promise<{ error: ErroSupabase | null }>;
  getPublicUrl(caminho: string): { data: { publicUrl: string } };
  remove(caminhos: string[]): Promise<{ error: ErroSupabase | null }>;
}

interface SupabaseStorageConfig {
  bucket: string;
  bucketClient: SupabaseBucket;
}

const MARCADOR_URL_PUBLICA = "/object/public/";

function erroStorage(mensagem: string, causa?: unknown) {
  return new AppError(ErrorCodes.ERRO_STORAGE, 502, mensagem, null, causa);
}

export function createSupabaseStorage({
  bucket,
  bucketClient,
}: SupabaseStorageConfig): StorageProvider {
  function caminhoDaUrl(url: string): string {
    const inicio = url.indexOf(MARCADOR_URL_PUBLICA);
    const resto =
      inicio === -1 ? "" : url.slice(inicio + MARCADOR_URL_PUBLICA.length);
    const prefixo = `${bucket}/`;

    if (!resto.startsWith(prefixo) || resto.length === prefixo.length) {
      throw erroStorage("URL de imagem inválida para remoção.");
    }

    return decodeURIComponent(resto.slice(prefixo.length).split("?")[0] ?? "");
  }

  return {
    async upload(arquivo, mime, caminho) {
      const { error } = await bucketClient.upload(caminho, arquivo, {
        contentType: mime,
        upsert: false,
      });

      if (error) {
        throw erroStorage("Falha ao enviar a imagem.", error);
      }

      return bucketClient.getPublicUrl(caminho).data.publicUrl;
    },

    async remove(url) {
      const caminho = caminhoDaUrl(url);
      const { error } = await bucketClient.remove([caminho]);

      if (error) {
        throw erroStorage("Falha ao remover a imagem.", error);
      }
    },
  };
}
