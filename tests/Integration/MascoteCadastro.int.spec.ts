import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/Infra/Database/Prisma";
import type { StorageProvider } from "@/Infra/Storage/StorageProvider";
import {
  criarEmpresaJunior,
  criarFederacao,
  criarUsuarioComToken,
} from "../Helpers/Factories";
import {
  setupIntegration,
  teardownIntegration,
} from "../Helpers/SetupIntegration";

type TestApp = Awaited<ReturnType<typeof setupIntegration>>;

const BOUNDARY = "----mascotedex-t16-boundary";
const FOTO_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

interface StorageFake extends StorageProvider {
  uploads: {
    buffer: Buffer;
    mime: string;
    path: string;
    url: string;
  }[];
  removals: string[];
}

function criarStorageFake(): StorageFake {
  const uploads: StorageFake["uploads"] = [];
  const removals: string[] = [];

  return {
    uploads,
    removals,

    async upload(buffer, mime, path) {
      const url = `https://storage.test/${path}`;

      uploads.push({
        buffer,
        mime,
        path,
        url,
      });

      return url;
    },

    async remove(url) {
      removals.push(url);
    },
  };
}

function corpoMultipart(
  campos: Record<string, string>,
  foto: Buffer | null = FOTO_JPEG,
): Buffer {
  const partes: Buffer[] = [];

  for (const [nome, valor] of Object.entries(campos)) {
    partes.push(
      Buffer.from(
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${nome}"\r\n\r\n${valor}\r\n`,
      ),
    );
  }

  if (foto) {
    partes.push(
      Buffer.from(
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="foto"; filename="mascote.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
      ),
      foto,
      Buffer.from("\r\n"),
    );
  }

  partes.push(Buffer.from(`--${BOUNDARY}--\r\n`));

  return Buffer.concat(partes);
}

describe("POST /mascotes — cadastro e primeira captura (T-16)", () => {
  let app: TestApp;
  let storage: StorageFake;
  let usuario: Awaited<ReturnType<typeof criarUsuarioComToken>>;
  let eventoId: string;
  let federacaoId: string;

  beforeEach(async () => {
    storage = criarStorageFake();

    app = await setupIntegration({
      storage,
      rateLimitMax: 10000,
      authRateLimitMax: 10000,
    });

    usuario = await criarUsuarioComToken(app);

    const evento = await prisma.evento.create({
      data: {
        nome: "Encontro de EJs",
        local: "Fortaleza",
        dataInicio: new Date("2026-11-08T00:00:00.000Z"),
        dataFim: new Date("2026-11-09T00:00:00.000Z"),
        usuarioId: usuario.id,
      },
    });

    eventoId = evento.id;

    const federacao = await criarFederacao({
      nome: "Federação Cearense",
      sigla: "FCE",
      estado: "CE",
      regiao: "Nordeste",
    });

    federacaoId = federacao.id;
  });

  afterAll(teardownIntegration);

  function post(
    campos: Record<string, string>,
    foto: Buffer | null = FOTO_JPEG,
  ) {
    return app.inject({
      method: "POST",
      url: "/mascotes",
      headers: {
        authorization: usuario.headers.authorization,
        "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
      },
      payload: corpoMultipart(campos, foto),
    });
  }

  it("201 cadastra mascote em EJ existente e cria a primeira captura (RN005/RN009)", async () => {
    const ej = await criarEmpresaJunior(federacaoId, {
      nome: "Include Jr.",
      universidade: "UFC",
    });

    const resposta = await post({
      nome: "Leão",
      eventoId,
      empresaJuniorId: ej.id,
      capturadoEm: "2026-11-08T12:30:00.000Z",
    });

    expect(resposta.statusCode).toBe(201);

    const perfil = resposta.json();

    expect(perfil).toMatchObject({
      nome: "Leão",
      fotoUrl: storage.uploads[0]?.url,
      capturado: true,
      empresaJunior: {
        id: ej.id,
        nome: "Include Jr.",
        universidade: "UFC",
      },
      federacao: {
        sigla: "FCE",
        estado: "CE",
      },
      eventos: [
        {
          id: eventoId,
          nome: "Encontro de EJs",
        },
      ],
    });

    expect(storage.uploads).toHaveLength(1);

    expect(storage.uploads[0]).toMatchObject({
      buffer: FOTO_JPEG,
      mime: "image/jpeg",
    });

    expect(storage.uploads[0]?.path).toMatch(/^mascotes\/[0-9a-f-]+\.jpg$/);

    expect(storage.removals).toEqual([]);

    expect(await prisma.mascote.count()).toBe(1);
    expect(await prisma.captura.count()).toBe(1);

    const captura = await prisma.captura.findFirstOrThrow();

    expect(captura).toMatchObject({
      usuarioId: usuario.id,
      eventoId,
      fotoUrl: perfil.fotoUrl,
      capturadoEm: new Date("2026-11-08T12:30:00.000Z"),
    });
  });

  it("201 cria EJ nova, mascote e captura na mesma operação", async () => {
    const resposta = await post({
      nome: "Raposa",
      eventoId,
      ejNome: "Júnior Ceará",
      ejUniversidade: "UFC",
      ejFederacaoId: federacaoId,
      ejCuriosidades: "Projeto de tecnologia.",
      confirmarNovaEj: "true",
    });

    expect(resposta.statusCode).toBe(201);

    expect(resposta.json()).toMatchObject({
      nome: "Raposa",
      empresaJunior: {
        nome: "Júnior Ceará",
        universidade: "UFC",
        curiosidades: "Projeto de tecnologia.",
      },
    });

    expect(await prisma.empresaJunior.count()).toBe(1);
    expect(await prisma.mascote.count()).toBe(1);
    expect(await prisma.captura.count()).toBe(1);

    expect(storage.uploads).toHaveLength(1);
  });

  it("401 sem token e com token inválido", async () => {
    const ej = await criarEmpresaJunior(federacaoId);

    const payload = corpoMultipart({
      nome: "Leão",
      eventoId,
      empresaJuniorId: ej.id,
    });

    const semToken = await app.inject({
      method: "POST",
      url: "/mascotes",
      headers: {
        "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
      },
      payload,
    });

    const tokenInvalido = await app.inject({
      method: "POST",
      url: "/mascotes",
      headers: {
        authorization: "Bearer token-invalido",
        "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
      },
      payload,
    });

    expect(semToken.statusCode).toBe(401);
    expect(tokenInvalido.statusCode).toBe(401);

    expect(storage.uploads).toHaveLength(0);
  });

  it("400 quando não envia foto ou envia imagem com magic bytes inválidos", async () => {
    const ej = await criarEmpresaJunior(federacaoId);

    const campos = {
      nome: "Leão",
      eventoId,
      empresaJuniorId: ej.id,
    };

    const semFoto = await post(campos, null);

    const fotoInvalida = await post(campos, Buffer.from("não é uma imagem"));

    expect(semFoto.statusCode).toBe(400);
    expect(semFoto.json().code).toBe("FOTO_INVALIDA");

    expect(fotoInvalida.statusCode).toBe(400);
    expect(fotoInvalida.json().code).toBe("FOTO_INVALIDA");

    expect(storage.uploads).toHaveLength(0);
  });

  it("404 para evento, EJ existente ou federação inexistentes, sem upload", async () => {
    const ej = await criarEmpresaJunior(federacaoId);

    const eventoInexistente = await post({
      nome: "Leão",
      eventoId: crypto.randomUUID(),
      empresaJuniorId: ej.id,
    });

    const ejInexistente = await post({
      nome: "Leão",
      eventoId,
      empresaJuniorId: crypto.randomUUID(),
    });

    const federacaoInexistente = await post({
      nome: "Raposa",
      eventoId,
      ejNome: "Júnior Nova",
      ejUniversidade: "UFC",
      ejFederacaoId: crypto.randomUUID(),
    });

    expect(eventoInexistente.statusCode).toBe(404);
    expect(ejInexistente.statusCode).toBe(404);
    expect(federacaoInexistente.statusCode).toBe(404);

    expect(storage.uploads).toHaveLength(0);
    expect(await prisma.mascote.count()).toBe(0);
  });

  it("409 MASCOTE_JA_CADASTRADO e não faz segundo upload (RN005)", async () => {
    const ej = await criarEmpresaJunior(federacaoId);

    const campos = {
      nome: "Leão",
      eventoId,
      empresaJuniorId: ej.id,
    };

    const primeiro = await post(campos);
    const segundo = await post(campos);

    expect(primeiro.statusCode).toBe(201);
    expect(segundo.statusCode).toBe(409);

    expect(segundo.json()).toMatchObject({
      code: "MASCOTE_JA_CADASTRADO",
    });

    expect(storage.uploads).toHaveLength(1);

    expect(await prisma.mascote.count()).toBe(1);
    expect(await prisma.captura.count()).toBe(1);
  });

  it("409 EJ_DUPLICADA para nome normalizado já cadastrado na federação (RN006)", async () => {
    await criarEmpresaJunior(federacaoId, {
      nome: "Júnior Ceará",
    });

    const resposta = await post({
      nome: "Raposa",
      eventoId,
      ejNome: "  JUNIOR   CEARA ",
      ejUniversidade: "UFC",
      ejFederacaoId: federacaoId,
      confirmarNovaEj: "true",
    });

    expect(resposta.statusCode).toBe(409);
    expect(resposta.json().code).toBe("EJ_DUPLICADA");

    expect(storage.uploads).toHaveLength(0);
    expect(await prisma.mascote.count()).toBe(0);
  });

  it("409 EJ_SIMILARES_ENCONTRADAS até confirmar a criação da nova EJ", async () => {
    await criarEmpresaJunior(federacaoId, {
      nome: "Júnior Ceará Tech",
    });

    const resposta = await post({
      nome: "Raposa",
      eventoId,
      ejNome: "Júnior Ceará",
      ejUniversidade: "UFC",
      ejFederacaoId: federacaoId,
    });

    expect(resposta.statusCode).toBe(409);

    expect(resposta.json()).toMatchObject({
      code: "EJ_SIMILARES_ENCONTRADAS",
      details: {
        sugestoes: [
          {
            nome: "Júnior Ceará Tech",
          },
        ],
      },
    });

    expect(storage.uploads).toHaveLength(0);
  });

  it("remove a foto do Storage se a transação falhar por usuário removido (RN015)", async () => {
    const proprietarioEvento = await criarUsuarioComToken(
      app,
      "MEMBRO",
      "criador-evento@email.com",
    );

    const evento = await prisma.evento.create({
      data: {
        nome: "Evento independente",
        local: "Fortaleza",
        dataInicio: new Date("2026-11-08T00:00:00.000Z"),
        dataFim: new Date("2026-11-08T00:00:00.000Z"),
        usuarioId: proprietarioEvento.id,
      },
    });

    const ej = await criarEmpresaJunior(federacaoId);

    const tokenDoUsuarioRemovido = usuario.headers.authorization;

    await prisma.evento.delete({
      where: { id: eventoId },
    });

    await prisma.usuario.delete({
      where: { id: usuario.id },
    });

    const resposta = await app.inject({
      method: "POST",
      url: "/mascotes",
      headers: {
        authorization: tokenDoUsuarioRemovido,
        "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
      },
      payload: corpoMultipart({
        nome: "Leão",
        eventoId: evento.id,
        empresaJuniorId: ej.id,
      }),
    });

    expect(resposta.statusCode).toBe(401);

    expect(storage.uploads).toHaveLength(1);

    expect(storage.removals).toEqual([storage.uploads[0]?.url]);

    expect(await prisma.mascote.count()).toBe(0);
    expect(await prisma.captura.count()).toBe(0);
  });

  it("400 rejeita capturadoEm mais de 5 minutos no futuro antes do upload (T-18)", async () => {
    const ej = await criarEmpresaJunior(federacaoId);

    const capturadoEm = new Date(Date.now() + 6 * 60 * 1000).toISOString();

    const resposta = await post({
      nome: "Leão Futuro",
      eventoId,
      empresaJuniorId: ej.id,
      capturadoEm,
    });

    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().code).toBe("VALIDATION_ERROR");

    expect(storage.uploads).toHaveLength(0);
    expect(await prisma.mascote.count()).toBe(0);
    expect(await prisma.captura.count()).toBe(0);
  });

  it("409 MASCOTE_JA_CADASTRADO no retry offline com EJ criada na primeira tentativa (RN014)", async () => {
    const campos = {
      nome: "Raposa Offline",
      eventoId,
      ejNome: "Empresa Junior Offline",
      ejUniversidade: "UFC",
      ejFederacaoId: federacaoId,
    };

    const primeira = await post(campos);
    const segunda = await post(campos);

    expect(primeira.statusCode).toBe(201);
    expect(segunda.statusCode).toBe(409);

    expect(segunda.json()).toMatchObject({
      code: "MASCOTE_JA_CADASTRADO",
      details: {
        mascoteId: primeira.json().id,
      },
    });

    expect(storage.uploads).toHaveLength(1);
    expect(await prisma.empresaJunior.count()).toBe(1);
    expect(await prisma.mascote.count()).toBe(1);
  });
});
