import { describe, expect, it } from "vitest";
import { parseEnv } from "../../src/Config/EnvSchema";

const baseEnv = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  DIRECT_URL: "postgresql://user:pass@localhost:5432/db",
  JWT_SECRET: "x".repeat(32),
};

describe("Env — validação das variáveis de ambiente", () => {
  it("aplica valores padrão", () => {
    const env = parseEnv(baseEnv);

    expect(env.PORT).toBe(3333);
    expect(env.JWT_EXPIRES_IN).toBe("7d");
    expect(env.RATE_LIMIT_AUTH_MAX).toBe(5);
    expect(env.CORS_ORIGINS).toEqual([]);
  });

  it("converte CORS_ORIGINS em lista", () => {
    const env = parseEnv({
      ...baseEnv,
      CORS_ORIGINS: "http://localhost:5173, https://app.exemplo.com",
    });

    expect(env.CORS_ORIGINS).toEqual([
      "http://localhost:5173",
      "https://app.exemplo.com",
    ]);
  });

  it("falha quando JWT_SECRET está ausente", () => {
    const { JWT_SECRET: _omitido, ...semSecret } = baseEnv;

    expect(() => parseEnv(semSecret)).toThrow(/JWT_SECRET/);
  });

  it("falha quando JWT_SECRET é curto", () => {
    expect(() => parseEnv({ ...baseEnv, JWT_SECRET: "curto" })).toThrow(
      /JWT_SECRET/,
    );
  });
});
