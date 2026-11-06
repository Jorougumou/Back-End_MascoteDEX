import multipart from "@fastify/multipart";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import { MAX_IMAGEM_BYTES } from "@/Shared/Utils/ImageValidation";

const MAX_CAMPOS = 20;
const MAX_TAMANHO_CAMPO = 2_000;

export interface ArquivoRecebido {
  campo: string;
  buffer: Buffer;
}

export interface MultipartLido {
  campos: Record<string, string>;
  arquivo: ArquivoRecebido | null;
}

export function registerMultipart(app: FastifyInstance) {
  app.register(multipart, {
    limits: {
      fileSize: MAX_IMAGEM_BYTES,
      files: 1,
      fields: MAX_CAMPOS,
      fieldSize: MAX_TAMANHO_CAMPO,
      parts: MAX_CAMPOS + 1,
    },
  });
}

function erroDeUpload(message: string): AppError {
  return new AppError(ErrorCodes.FOTO_INVALIDA, 400, message);
}

export async function lerMultipart(
  request: FastifyRequest,
): Promise<MultipartLido> {
  if (!request.isMultipart()) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      400,
      "A requisição deve ser multipart/form-data.",
    );
  }

  const campos: Record<string, string> = {};
  let arquivo: ArquivoRecebido | null = null;

  try {
    for await (const parte of request.parts()) {
      if (parte.type === "file") {
        const buffer = await parte.toBuffer();
        if (parte.file.truncated) {
          throw erroDeUpload("A foto deve ter no máximo 10 MB.");
        }
        arquivo = { campo: parte.fieldname, buffer };
      } else if (typeof parte.value === "string") {
        campos[parte.fieldname] = parte.value;
      }
    }
  } catch (erro) {
    if (erro instanceof AppError) throw erro;
    throw erroDeUpload(
      "Upload inválido: verifique o tamanho e a quantidade de arquivos.",
    );
  }

  return { campos, arquivo };
}
