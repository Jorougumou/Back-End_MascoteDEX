import { describe, expect, it } from "vitest";
import { AppError } from "@/Shared/Errors/AppError";
import {
  resolverDataCaptura,
  TOLERANCIA_RELOGIO_MS,
} from "@/Shared/Utils/CapturadoEm";

const AGORA = new Date("2026-11-09T18:00:00.000Z");

describe("resolverDataCaptura — sincronização offline (RN014)", () => {
  it("usa o horário do servidor quando o cliente não informa capturadoEm", () => {
    expect(resolverDataCaptura(undefined, AGORA)).toBe(AGORA);
  });

  it("preserva a data original enviada pelo cliente offline", () => {
    const original = new Date("2026-11-08T10:30:00.000Z");

    expect(resolverDataCaptura(original, AGORA)).toBe(original);
  });

  it("aceita data até 5 minutos no futuro por tolerância do relógio", () => {
    const limite = new Date(AGORA.getTime() + TOLERANCIA_RELOGIO_MS);

    expect(resolverDataCaptura(limite, AGORA)).toBe(limite);
  });

  it("rejeita data mais de 5 minutos no futuro com erro de validação", () => {
    const futura = new Date(AGORA.getTime() + TOLERANCIA_RELOGIO_MS + 1);

    try {
      resolverDataCaptura(futura, AGORA);
      throw new Error("Era esperado AppError");
    } catch (erro) {
      expect(erro).toBeInstanceOf(AppError);
      expect(erro).toMatchObject({
        code: "VALIDATION_ERROR",
        statusCode: 400,
        details: [
          {
            local: "body",
            campo: "capturadoEm",
            mensagem: "data futura",
          },
        ],
      });
    }
  });
});
