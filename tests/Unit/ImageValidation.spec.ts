import { describe, expect, it } from "vitest";
import { AppError } from "@/Shared/Errors/AppError";
import {
  MAX_IMAGEM_BYTES,
  gerarNomeArquivo,
  validarImagem,
} from "@/Shared/Utils/ImageValidation";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const webp = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP"),
  Buffer.from("VP8 "),
]);

function erroDe(fn: () => unknown): AppError {
  try {
    fn();
  } catch (erro) {
    if (erro instanceof AppError) return erro;
  }
  throw new Error("Esperava AppError");
}

describe("ImageValidation — magic bytes e tamanho (RN008)", () => {
  it("aceita JPEG, PNG e WebP pela assinatura", () => {
    expect(validarImagem(jpeg)).toEqual({
      mime: "image/jpeg",
      extensao: "jpg",
    });
    expect(validarImagem(png)).toEqual({ mime: "image/png", extensao: "png" });
    expect(validarImagem(webp)).toEqual({
      mime: "image/webp",
      extensao: "webp",
    });
  });

  it("rejeita arquivo que não é imagem (ex.: texto/HTML com extensão .jpg)", () => {
    const erro = erroDe(() =>
      validarImagem(Buffer.from("<html>fake.jpg</html>")),
    );
    expect(erro.code).toBe("FOTO_INVALIDA");
    expect(erro.statusCode).toBe(400);
  });

  it("rejeita RIFF que não é WebP (ex.: WAV)", () => {
    const wav = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("WAVE"),
    ]);
    expect(erroDe(() => validarImagem(wav)).code).toBe("FOTO_INVALIDA");
  });

  it("rejeita buffer vazio ou curto demais", () => {
    expect(erroDe(() => validarImagem(Buffer.alloc(0))).code).toBe(
      "FOTO_INVALIDA",
    );
    expect(erroDe(() => validarImagem(Buffer.from([0xff]))).code).toBe(
      "FOTO_INVALIDA",
    );
  });

  it("aceita exatamente 10 MB e rejeita acima disso", () => {
    const limite = Buffer.alloc(MAX_IMAGEM_BYTES);
    jpeg.copy(limite);
    expect(validarImagem(limite).mime).toBe("image/jpeg");

    const acima = Buffer.alloc(MAX_IMAGEM_BYTES + 1);
    jpeg.copy(acima);
    expect(erroDe(() => validarImagem(acima)).code).toBe("FOTO_INVALIDA");
  });

  it("gera nome pelo servidor com a extensão validada", () => {
    const nome = gerarNomeArquivo("png");
    expect(nome).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(gerarNomeArquivo("png")).not.toBe(nome);
  });
});
