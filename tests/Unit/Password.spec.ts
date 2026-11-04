import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/Shared/Utils/Password";

describe("Password — hash de senha (RNF006, RN003)", () => {
  it("gera hash argon2id diferente da senha original", async () => {
    const hash = await hashPassword("senha-segura-123");

    expect(hash).not.toBe("senha-segura-123");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("valida a senha correta e rejeita a incorreta", async () => {
    const hash = await hashPassword("senha-segura-123");

    expect(await verifyPassword(hash, "senha-segura-123")).toBe(true);
    expect(await verifyPassword(hash, "outra-senha-456")).toBe(false);
  });

  it("retorna false quando o hash armazenado é inválido", async () => {
    expect(await verifyPassword("isso-nao-e-um-hash", "qualquer")).toBe(false);
  });
});
