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

const BOUNDARY = "----mascotdex-t18-boundary";
const FOTO = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

function criarStorageFake() {
  const uploads: string[] = [];
  const removals: string[] = [];

  const storage: StorageProvider = {
    async upload(_buffer, _mime, path) {
      const url = `https://storage.test/${path}`;
      uploads.push(url);
      return url;
    },
    async remove(url) {
      removals.push(url);
    },
  };

  return { storage, uploads, removals };
}

function multipart(campos: Record<string, string>): Buffer {
  const partes: Buffer[] = [];

  for (const [nome, valor] of Object.entries(campos)) {
    partes.push(
      Buffer.from(
        `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${nome}"\r\n\r\n${valor}\r\n`,
      ),
    );
  }

  partes.push(
    Buffer.from(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="foto"; filename="captura.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
    ),
    FOTO,
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
  );

  return Buffer.concat(partes);
}

describe("POST /mascotes/:id/capturas — idempotência offline (T-18)", () => {
  let app: TestApp;
  let usuario: Awaited<ReturnType<typeof criarUsuarioComToken>>;
  let mascoteId: string;
  let eventoId: string;
  let uploads: string[];
  let removals: string[];

  beforeEach(async () => {
    const fake = criarStorageFake();

    uploads = fake.uploads;
    removals = fake.removals;

    app = await setupIntegration({
      storage: fake.storage,
      rateLimitMax: 10000,
      authRateLimitMax: 10000,
    });

    usuario = await criarUsuarioComToken(app);

    const evento = await prisma.evento.create({
      data: {
        nome: "Evento T18",
        local: "Fortaleza",
        dataInicio: new Date("2026-11-09T00:00:00.000Z"),
        dataFim: new Date("2026-11-10T00:00:00.000Z"),
        usuarioId: usuario.id,
      },
    });

    eventoId = evento.id;

    const federacao = await criarFederacao({
      sigla: "T18",
      estado: "CE",
    });

    const ej = await criarEmpresaJunior(federacao.id, {
      nome: "EJ T18",
    });

    const mascote = await prisma.mascote.create({
      data: {
        nome: "Mascote T18",
        nomeNormalizado: "mascote t18",
        fotoUrl: "https://storage.test/mascotes/original.jpg",
        empresaJuniorId: ej.id,
        usuarioId: usuario.id,
      },
    });

    mascoteId = mascote.id;
  });

  afterAll(teardownIntegration);

  function post(capturadoEm?: string) {
    return app.inject({
      method: "POST",
      url: `/mascotes/${mascoteId}/capturas`,
      headers: {
        authorization: usuario.headers.authorization,
        "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
      },
      payload: multipart({
        eventoId,
        ...(capturadoEm ? { capturadoEm } : {}),
      }),
    });
  }

  it("persiste a data original enviada na sincronização offline", async () => {
    const original = "2026-11-08T10:30:00.000Z";

    const resposta = await post(original);

    expect(resposta.statusCode).toBe(201);
    expect(resposta.json().capturadoEm).toBe(original);
    expect(resposta.json().sincronizadoEm).toBeTruthy();

    const registro = await prisma.captura.findFirstOrThrow();

    expect(registro.capturadoEm.toISOString()).toBe(original);
    expect(uploads).toHaveLength(1);
  });

  it("responde 409 CAPTURA_DUPLICADA no reenvio e não faz outro upload", async () => {
    const original = "2026-11-08T10:30:00.000Z";

    const primeira = await post(original);
    const segunda = await post(original);

    expect(primeira.statusCode).toBe(201);
    expect(segunda.statusCode).toBe(409);
    expect(segunda.json().code).toBe("CAPTURA_DUPLICADA");

    expect(uploads).toHaveLength(1);
    expect(removals).toHaveLength(0);
    expect(await prisma.captura.count()).toBe(1);
  });

  it("rejeita capturadoEm mais de 5 minutos no futuro antes do upload", async () => {
    const futura = new Date(Date.now() + 6 * 60 * 1000).toISOString();

    const resposta = await post(futura);

    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().code).toBe("VALIDATION_ERROR");

    expect(uploads).toHaveLength(0);
    expect(await prisma.captura.count()).toBe(0);
  });
});
