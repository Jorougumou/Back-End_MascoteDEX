import Fastify from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { errorHandler } from "@/Shared/Errors/ErrorHandler";
import {
  lerMultipart,
  registerMultipart,
} from "@/Shared/Plugins/MultipartPlugin";
import { MAX_IMAGEM_BYTES } from "@/Shared/Utils/ImageValidation";

const LIMITE = "----limite-de-teste";

function corpo(
  campos: Record<string, string>,
  arquivos: { nome: string; conteudo: Buffer }[] = [],
): Buffer {
  const partes: Buffer[] = [];
  for (const [nome, valor] of Object.entries(campos)) {
    partes.push(
      Buffer.from(
        `--${LIMITE}\r\nContent-Disposition: form-data; name="${nome}"\r\n\r\n${valor}\r\n`,
      ),
    );
  }
  for (const arq of arquivos) {
    partes.push(
      Buffer.from(
        `--${LIMITE}\r\nContent-Disposition: form-data; name="${arq.nome}"; filename="x.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
      ),
      arq.conteudo,
      Buffer.from("\r\n"),
    );
  }
  partes.push(Buffer.from(`--${LIMITE}--\r\n`));
  return Buffer.concat(partes);
}

const headers = { "content-type": `multipart/form-data; boundary=${LIMITE}` };

function buildAppDeTeste() {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  registerMultipart(app);
  app.post("/upload", async (request) => {
    const { campos, arquivo } = await lerMultipart(request);
    return {
      campos,
      bytes: arquivo?.buffer.length ?? null,
      campo: arquivo?.campo ?? null,
    };
  });
  return app;
}

describe("Multipart — leitura de campos e foto (RN008)", () => {
  const app = buildAppDeTeste();

  beforeAll(() => app.ready());
  afterAll(() => app.close());

  it("lê campos de texto e a foto", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/upload",
      headers,
      payload: corpo({ nome: "Leão", empresaJuniorId: "abc" }, [
        { nome: "foto", conteudo: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) },
      ]),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      campos: { nome: "Leão", empresaJuniorId: "abc" },
      bytes: 4,
      campo: "foto",
    });
  });

  it("aceita requisição sem foto", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/upload",
      headers,
      payload: corpo({ nome: "Leão" }),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().bytes).toBeNull();
  });

  it("rejeita requisição que não é multipart", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/upload",
      payload: { nome: "x" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("VALIDATION_ERROR");
  });

  it("rejeita foto acima de 10 MB com FOTO_INVALIDA", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/upload",
      headers,
      payload: corpo({}, [
        { nome: "foto", conteudo: Buffer.alloc(MAX_IMAGEM_BYTES + 1024) },
      ]),
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("FOTO_INVALIDA");
  });

  it("rejeita mais de um arquivo com FOTO_INVALIDA", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/upload",
      headers,
      payload: corpo({}, [
        { nome: "foto", conteudo: Buffer.from([0xff, 0xd8, 0xff]) },
        { nome: "outra", conteudo: Buffer.from([0xff, 0xd8, 0xff]) },
      ]),
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("FOTO_INVALIDA");
  });
});
