import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  setupIntegration,
  teardownIntegration,
} from "../Helpers/SetupIntegration";

describe("Swagger, helmet e CORS", () => {
  let app: Awaited<ReturnType<typeof setupIntegration>>;

  beforeAll(async () => {
    app = await setupIntegration();
  });

  afterAll(teardownIntegration);

  it("expõe a especificação OpenAPI com as rotas registradas (RNF007)", async () => {
    const response = await app.inject({ method: "GET", url: "/docs/json" });
    const spec = response.json();

    expect(response.statusCode).toBe(200);
    expect(spec.info.title).toBe("MascotDex API");
    expect(spec.paths["/health"]).toBeDefined();
  });

  it("serve a interface do Swagger em /docs", async () => {
    let url = "/docs";
    let response = await app.inject({ method: "GET", url });

    for (
      let i = 0;
      i < 3 && response.statusCode >= 300 && response.statusCode < 400;
      i++
    ) {
      const destino = new URL(
        String(response.headers.location),
        `http://localhost${url}`,
      );
      url = destino.pathname + destino.search;
      response = await app.inject({ method: "GET", url });
    }

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
  });

  it("aplica headers de segurança do helmet", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

});
