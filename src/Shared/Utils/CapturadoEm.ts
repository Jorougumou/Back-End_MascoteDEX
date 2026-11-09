import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";

export const TOLERANCIA_RELOGIO_MS = 5 * 60 * 1000;

export function resolverDataCaptura(
  capturadoEm: Date | undefined,
  agora: Date,
): Date {
  const data = capturadoEm ?? agora;

  if (data.getTime() > agora.getTime() + TOLERANCIA_RELOGIO_MS) {
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

  return data;
}
