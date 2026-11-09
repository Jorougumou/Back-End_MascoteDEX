import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError } from "@/Shared/Errors/AppError";
import { errorHandler, notFoundHandler } from "@/Shared/Errors/ErrorHandler";

function buildTestApp() {
  const app = Fastify();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  app.get("/app-error", async () => {
    throw new AppError(
      "CAPTURA_DUPLICADA",
      409,
      "Você já capturou este mascote.",
      { mascoteId: "1" },
    );
  });

  app.get("/boom", async () => {
    throw new Error("detalhe interno secreto");
  });

  app
    .withTypeProvider<ZodTypeProvider>()
    .post(
      "/validar",
      { schema: { body: z.object({ nome: z.string().min(3) }) } },
      async () => ({ ok: true }),
    );

  return app;
}

describe("ErrorHandler — formato padrão de erro (D-13)", () => {
  it("converte AppError no formato padrão", async () => {
    const app = buildTestApp();
    const response = await app.inject({ method: "GET", url: "/app-error" });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      statusCode: 409,
      code: "CAPTURA_DUPLICADA",
      message: "Você já capturou este mascote.",
      details: { mascoteId: "1" },
    });
  });

  it("retorna 400 VALIDATION_ERROR com detalhes quando o Zod rejeita", async () => {
    const app = buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/validar",
      payload: { nome: "a" },
    });
    const body = response.json();

    expect(response.statusCode).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.details.length).toBeGreaterThan(0);
  });

  it("retorna 500 genérico sem vazar detalhes do erro inesperado", async () => {
    const app = buildTestApp();
    const response = await app.inject({ method: "GET", url: "/boom" });

    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe("ERRO_INTERNO");
    expect(response.body).not.toContain("detalhe interno secreto");
  });

  it("retorna 404 padronizado para rota inexistente", async () => {
    const app = buildTestApp();
    const response = await app.inject({ method: "GET", url: "/nao-existe" });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe("NAO_ENCONTRADO");
  });
});

describe("ErrorHandler — AppError 5xx (D-38)", () => {
  it("loga a causa no servidor e não a expõe na resposta", async () => {
    const linhas: string[] = [];
    const app = Fastify({
      logger: {
        level: "error",
        stream: { write: (linha: string) => void linhas.push(linha) },
      },
    });
    app.setErrorHandler(errorHandler);
    app.get("/storage", async () => {
      throw new AppError(
        "ERRO_STORAGE",
        502,
        "Falha ao enviar a imagem.",
        null,
        new Error("chave-secreta-do-supabase"),
      );
    });

    const response = await app.inject({ method: "GET", url: "/storage" });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      statusCode: 502,
      code: "ERRO_STORAGE",
      message: "Falha ao enviar a imagem.",
      details: null,
    });
    expect(response.body).not.toMatch(/chave-secreta/);
    expect(linhas.join("")).toMatch(/chave-secreta-do-supabase/);
  });
});
