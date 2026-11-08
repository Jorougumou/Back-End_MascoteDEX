import { describe, expect, it } from "vitest";
import { createStorage } from "@/Infra/Storage/StorageFactory";
import {
  createSupabaseStorage,
  type SupabaseBucket,
} from "@/Infra/Storage/SupabaseStorage";
import { AppError } from "@/Shared/Errors/AppError";

const BASE = "https://projeto.supabase.co/storage/v1/object/public/mascotdex";

function criarBucketFalso(erro: { message: string } | null = null) {
  const uploads: Array<{
    caminho: string;
    arquivo: Buffer;
    opcoes: { contentType: string; upsert: boolean };
  }> = [];
  const remocoes: string[][] = [];

  const bucketClient: SupabaseBucket = {
    async upload(caminho, arquivo, opcoes) {
      uploads.push({ caminho, arquivo, opcoes });
      return { error: erro };
    },
    getPublicUrl(caminho) {
      return { data: { publicUrl: `${BASE}/${caminho}` } };
    },
    async remove(caminhos) {
      remocoes.push(caminhos);
      return { error: erro };
    },
  };

  return { bucketClient, uploads, remocoes };
}

async function capturarErro(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (error) {
    return error;
  }
  throw new Error("era esperado um erro");
}

describe("SupabaseStorage — upload (RNF005)", () => {
  it("envia o buffer com o content-type, sem sobrescrever, e devolve a URL pública", async () => {
    const { bucketClient, uploads } = criarBucketFalso();
    const storage = createSupabaseStorage({
      bucket: "mascotdex",
      bucketClient,
    });
    const arquivo = Buffer.from("foto");

    const url = await storage.upload(arquivo, "image/png", "mascotes/a.png");

    expect(url).toBe(`${BASE}/mascotes/a.png`);
    expect(uploads).toEqual([
      {
        caminho: "mascotes/a.png",
        arquivo,
        opcoes: { contentType: "image/png", upsert: false },
      },
    ]);
  });

  it("falha do Supabase vira ERRO_STORAGE 502 sem vazar a mensagem original", async () => {
    const { bucketClient } = criarBucketFalso({
      message: "chave secreta inválida",
    });
    const storage = createSupabaseStorage({
      bucket: "mascotdex",
      bucketClient,
    });

    const erro = await capturarErro(
      storage.upload(Buffer.from("x"), "image/png", "mascotes/a.png"),
    );

    expect(erro).toBeInstanceOf(AppError);
    expect(erro).toMatchObject({ code: "ERRO_STORAGE", statusCode: 502 });
    expect((erro as AppError).message).not.toMatch(/chave/);
    expect((erro as AppError).cause).toEqual({
      message: "chave secreta inválida",
    });
  });
});

describe("SupabaseStorage — remove (RN015)", () => {
  it("deriva o caminho a partir da URL pública (inclusive com pastas e %20)", async () => {
    const { bucketClient, remocoes } = criarBucketFalso();
    const storage = createSupabaseStorage({
      bucket: "mascotdex",
      bucketClient,
    });

    await storage.remove(`${BASE}/capturas/evento-1/foto%20um.jpg`);

    expect(remocoes).toEqual([["capturas/evento-1/foto um.jpg"]]);
  });

  it("URL de outro bucket ou fora do padrão → ERRO_STORAGE e nada é removido", async () => {
    const { bucketClient, remocoes } = criarBucketFalso();
    const storage = createSupabaseStorage({
      bucket: "mascotdex",
      bucketClient,
    });

    const outroBucket = await capturarErro(
      storage.remove(
        "https://projeto.supabase.co/storage/v1/object/public/outro/a.png",
      ),
    );
    const foraDoPadrao = await capturarErro(
      storage.remove("https://exemplo.com/a.png"),
    );

    expect(outroBucket).toMatchObject({ code: "ERRO_STORAGE" });
    expect(foraDoPadrao).toMatchObject({ code: "ERRO_STORAGE" });
    expect(remocoes).toEqual([]);
  });

  it("falha do Supabase na remoção vira ERRO_STORAGE 502", async () => {
    const { bucketClient } = criarBucketFalso({ message: "falhou" });
    const storage = createSupabaseStorage({
      bucket: "mascotdex",
      bucketClient,
    });

    const erro = await capturarErro(storage.remove(`${BASE}/mascotes/a.png`));

    expect(erro).toMatchObject({ code: "ERRO_STORAGE", statusCode: 502 });
  });
});

describe("StorageFactory — D-32/D-38", () => {
  it("sem SUPABASE_URL/SERVICE_ROLE_KEY (inclusive vazias) o storage falha só ao usar", async () => {
    const storage = createStorage({
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      SUPABASE_BUCKET: "mascotdex",
    });

    const upload = await capturarErro(
      storage.upload(Buffer.from("x"), "image/png", "mascotes/a.png"),
    );
    const remove = await capturarErro(storage.remove(`${BASE}/mascotes/a.png`));

    expect(upload).toMatchObject({ code: "ERRO_STORAGE", statusCode: 502 });
    expect(remove).toMatchObject({ code: "ERRO_STORAGE", statusCode: 502 });
  });

  it("com as variáveis configuradas cria o provider sem acessar a rede", () => {
    const storage = createStorage({
      SUPABASE_URL: "https://projeto.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "chave-falsa-de-teste",
      SUPABASE_BUCKET: "mascotdex",
    });

    expect(typeof storage.upload).toBe("function");
    expect(typeof storage.remove).toBe("function");
  });
});
