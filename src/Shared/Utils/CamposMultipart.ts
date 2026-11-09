import type { FastifySchemaCompiler } from "fastify";
import { validatorCompiler } from "fastify-type-provider-zod";
import type { z } from "zod";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";

export const validatorCompilerMultipart: FastifySchemaCompiler<unknown> = (
  opcoes,
) =>
  opcoes.httpPart === "body"
    ? () => ({ value: undefined })
    : validatorCompiler({ ...opcoes, schema: opcoes.schema as z.ZodType });

export function validarCampos<S extends z.ZodType>(
  schema: S,
  campos: Record<string, string>,
): z.output<S> {
  const preenchidos = Object.fromEntries(
    Object.entries(campos).filter(([, valor]) => valor.trim() !== ""),
  );
  const resultado = schema.safeParse(preenchidos);

  if (!resultado.success) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      400,
      "Dados inválidos.",
      resultado.error.issues.map((problema) => ({
        local: "body",
        campo: problema.path.join("."),
        mensagem: problema.message,
      })),
    );
  }

  return resultado.data;
}
