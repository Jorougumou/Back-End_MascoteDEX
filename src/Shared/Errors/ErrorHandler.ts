import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod";
import { AppError } from "./AppError";
import { ErrorCodes, type ErrorCode } from "./ErrorCodes";

export function buildErrorBody(
  statusCode: number,
  code: ErrorCode,
  message: string,
  details: unknown = null,
) {
  return { statusCode, code, message, details };
}

function codeFromStatus(statusCode: number): ErrorCode {
  switch (statusCode) {
    case 401:
      return ErrorCodes.NAO_AUTENTICADO;
    case 403:
      return ErrorCodes.SEM_PERMISSAO;
    case 404:
      return ErrorCodes.NAO_ENCONTRADO;
    case 429:
      return ErrorCodes.RATE_LIMIT;
    default:
      return ErrorCodes.VALIDATION_ERROR;
  }
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    return reply
      .status(error.statusCode)
      .send(
        buildErrorBody(
          error.statusCode,
          error.code,
          error.message,
          error.details,
        ),
      );
  }

  if (hasZodFastifySchemaValidationErrors(error)) {
    const details = error.validation.map((issue) => ({
      local: error.validationContext,
      campo: issue.instancePath.replace(/^\//, "").replaceAll("/", "."),
      mensagem: issue.message ?? "Valor inválido",
    }));

    return reply
      .status(400)
      .send(
        buildErrorBody(
          400,
          ErrorCodes.VALIDATION_ERROR,
          "Dados inválidos.",
          details,
        ),
      );
  }

  if (isResponseSerializationError(error)) {
    request.log.error({ err: error }, "Falha ao serializar a resposta");

    return reply
      .status(500)
      .send(
        buildErrorBody(
          500,
          ErrorCodes.ERRO_INTERNO,
          "Erro interno do servidor.",
        ),
      );
  }

  const status = error.statusCode;
  if (status && status >= 400 && status < 500) {
    return reply
      .status(status)
      .send(buildErrorBody(status, codeFromStatus(status), error.message));
  }

  request.log.error({ err: error }, "Erro inesperado");

  return reply
    .status(500)
    .send(
      buildErrorBody(500, ErrorCodes.ERRO_INTERNO, "Erro interno do servidor."),
    );
}

export function notFoundHandler(_request: FastifyRequest, reply: FastifyReply) {
  return reply
    .status(404)
    .send(
      buildErrorBody(404, ErrorCodes.NAO_ENCONTRADO, "Rota não encontrada."),
    );
}
