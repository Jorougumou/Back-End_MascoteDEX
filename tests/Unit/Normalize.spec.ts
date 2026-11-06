import { describe, expect, it } from "vitest";
import { normalizarTexto } from "@/Shared/Utils/Normalize";

describe("Normalize — busca sem acento/caixa (RN004, RN013)", () => {
  it("remove acentos e converte para minúsculas", () => {
    expect(normalizarTexto("Júnior Consultoria ÁÉÍÓÚ ç")).toBe(
      "junior consultoria aeiou c",
    );
  });

  it("colapsa espaços e remove as pontas", () => {
    expect(normalizarTexto("  Empresa   Jr \n Ceará  ")).toBe(
      "empresa jr ceara",
    );
  });

  it("trata texto vazio e só com espaços", () => {
    expect(normalizarTexto("")).toBe("");
    expect(normalizarTexto("   ")).toBe("");
  });

  it("é idempotente", () => {
    const uma = normalizarTexto("Ação Júnior");
    expect(normalizarTexto(uma)).toBe(uma);
  });
});
