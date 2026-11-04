import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  setupIntegration,
  teardownIntegration,
} from "../Helpers/SetupIntegration";

describe("Rate limit global", () => {
  let app: Awaited<ReturnType<typeof setupIntegration>>;

  beforeAll(async () => {
    app = await setupIntegration({ rateLimitMax: 2 });
  });

  afterAll(teardownIntegration);

  it("responde 429 no formato padrão ao exceder o limite (RN016)", async () => {
    const primeira = await app.inject({ method: "GET", url: "/docs/json" });
    const segunda = await app.inject({ method: "GET", url: "/docs/json" });
    const terceira = await app.inject({ method: "GET", url: "/docs/json" });

    expect(primeira.statusCode).toBe(200);
    expect(segunda.statusCode).toBe(200);
    expect(terceira.statusCode).toBe(429);
    expect(terceira.json().code).toBe("RATE_LIMIT");
  });

  it("não limita o /health (healthcheck do Railway)", async () => {
    for (let i = 0; i < 5; i++) {
      const response = await app.inject({ method: "GET", url: "/health" });
      expect(response.statusCode).toBe(200);
    }
  });
});
