import { randomUUID } from "node:crypto";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";

export const MAX_IMAGEM_BYTES = 10 * 1024 * 1024;

export type ImagemMime = "image/jpeg" | "image/png" | "image/webp";

export interface ImagemValidada {
  mime: ImagemMime;
  extensao: "jpg" | "png" | "webp";
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

function comecaCom(buffer: Buffer, assinatura: number[], offset = 0): boolean {
  if (buffer.length < offset + assinatura.length) return false;
  return assinatura.every((byte, i) => buffer[offset + i] === byte);
}

function fotoInvalida(message: string): AppError {
  return new AppError(ErrorCodes.FOTO_INVALIDA, 400, message);
}

export function validarImagem(buffer: Buffer): ImagemValidada {
  if (buffer.length === 0) throw fotoInvalida("A foto está vazia.");
  if (buffer.length > MAX_IMAGEM_BYTES) {
    throw fotoInvalida("A foto deve ter no máximo 10 MB.");
  }
  if (comecaCom(buffer, JPEG)) return { mime: "image/jpeg", extensao: "jpg" };
  if (comecaCom(buffer, PNG)) return { mime: "image/png", extensao: "png" };
  if (comecaCom(buffer, RIFF) && comecaCom(buffer, WEBP, 8)) {
    return { mime: "image/webp", extensao: "webp" };
  }
  throw fotoInvalida("Formato de foto inválido. Envie JPEG, PNG ou WebP.");
}

export function gerarNomeArquivo(extensao: ImagemValidada["extensao"]): string {
  return `${randomUUID()}.${extensao}`;
}
