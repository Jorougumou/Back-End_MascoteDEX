import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  setupIntegration,
  teardownIntegration,
} from "../Helpers/SetupIntegration";

describe("GET /health", () => {
  let app: Awaited<ReturnType<typeof setupIntegration>>;

  beforeAll(async () => {
    app = await setupIntegration();
  });

  afterAll(teardownIntegration);

  it("retorna status ok sem exigir autenticação", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok" });
  });

  it("retorna 404 no formato padrão para rota inexistente", async () => {
    const response = await app.inject({ method: "GET", url: "/nao-existe" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      statusCode: 404,
      code: "NAO_ENCONTRADO",
      message: "Rota não encontrada.",
      details: null,
    });
  });
});
