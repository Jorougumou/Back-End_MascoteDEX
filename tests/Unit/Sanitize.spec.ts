import { describe, expect, it } from "vitest";
import { contemHtml, sanitizarTexto } from "@/Shared/Utils/Sanitize";

describe("Sanitize — texto livre sem HTML (RNF006, RN008)", () => {
  it("remove tags HTML mantendo o texto", () => {
    expect(sanitizarTexto("<b>Mascote</b> <i>Leão</i>")).toBe("Mascote Leão");
  });

  it("remove script inteiro como tag, sem executar nada", () => {
    expect(sanitizarTexto("Oi<script>alert(1)</script>")).toBe("Oialert(1)");
  });

  it("remove < e > soltos", () => {
    expect(sanitizarTexto("5 > 3")).toBe("5 3");
    expect(sanitizarTexto("a < b")).toBe("a b");
  });

  it("troca caracteres de controle por espaço e colapsa espaços", () => {
    expect(sanitizarTexto("  linha1\n\tlinha2\u0000fim  ")).toBe(
      "linha1 linha2 fim",
    );
  });

  it("preserva acentos e pontuação normal", () => {
    expect(sanitizarTexto("Empresa Jr. — Fortaleza/CE")).toBe(
      "Empresa Jr. — Fortaleza/CE",
    );
  });

  it("contemHtml detecta < ou >", () => {
    expect(contemHtml("<b>x</b>")).toBe(true);
    expect(contemHtml("texto limpo")).toBe(false);
  });
});
