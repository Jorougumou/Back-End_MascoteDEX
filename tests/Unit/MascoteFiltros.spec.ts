import { describe, expect, it } from "vitest";
import { montarWhereGaleria } from "@/Modules/Mascotes/MascoteRepository";
import { galeriaQuerySchema } from "@/Modules/Mascotes/MascoteSchemas";

describe("RF006 — validação da querystring da galeria", () => {
  it("aplica os padrões quando nada é informado", () => {
    const resultado = galeriaQuerySchema.parse({});

    expect(resultado).toEqual({ page: 1, limit: 20, minhaColecao: false });
  });

  it("normaliza o estado para maiúsculas", () => {
    expect(galeriaQuerySchema.parse({ estado: " sp " }).estado).toBe("SP");
  });

  it("rejeita estado que não tem 2 letras", () => {
    expect(galeriaQuerySchema.safeParse({ estado: "SPP" }).success).toBe(false);
    expect(galeriaQuerySchema.safeParse({ estado: "S1" }).success).toBe(false);
    expect(galeriaQuerySchema.safeParse({ estado: "" }).success).toBe(false);
  });

  it("exige federacaoId em formato uuid", () => {
    const uuid = crypto.randomUUID();

    expect(galeriaQuerySchema.parse({ federacaoId: uuid }).federacaoId).toBe(
      uuid,
    );
    expect(galeriaQuerySchema.safeParse({ federacaoId: "abc" }).success).toBe(
      false,
    );
  });

  it("converte minhaColecao de texto para boolean ('false' não vira true)", () => {
    expect(
      galeriaQuerySchema.parse({ minhaColecao: "true" }).minhaColecao,
    ).toBe(true);
    expect(
      galeriaQuerySchema.parse({ minhaColecao: "false" }).minhaColecao,
    ).toBe(false);
    expect(
      galeriaQuerySchema.safeParse({ minhaColecao: "talvez" }).success,
    ).toBe(false);
  });

  it("rejeita nome da EJ vazio ou com HTML", () => {
    expect(galeriaQuerySchema.safeParse({ empresaJunior: "   " }).success).toBe(
      false,
    );
    expect(
      galeriaQuerySchema.safeParse({ empresaJunior: "<script>" }).success,
    ).toBe(false);
  });

  it("mantém os limites de paginação (máximo 50)", () => {
    expect(galeriaQuerySchema.safeParse({ limit: "51" }).success).toBe(false);
    expect(galeriaQuerySchema.parse({ page: "2", limit: "10" })).toMatchObject({
      page: 2,
      limit: 10,
    });
  });
});

describe("RN013 — montagem do where da galeria", () => {
  const usuarioId = "usuario-1";

  it("sem filtros, o where fica vazio (galeria completa)", () => {
    expect(montarWhereGaleria(usuarioId, { minhaColecao: false })).toEqual({});
  });

  it("filtra por estado e federação pela EJ", () => {
    const federacaoId = crypto.randomUUID();

    expect(
      montarWhereGaleria(usuarioId, {
        estado: "SP",
        federacaoId,
        minhaColecao: false,
      }),
    ).toEqual({
      empresaJunior: { federacaoId, federacao: { estado: "SP" } },
    });
  });

  it("busca parcial pelo nome normalizado da EJ", () => {
    expect(
      montarWhereGaleria(usuarioId, {
        empresaJuniorNormalizado: "junior",
        minhaColecao: false,
      }),
    ).toEqual({
      empresaJunior: { nomeNormalizado: { contains: "junior" } },
    });
  });

  it("minhaColecao restringe às capturas do usuário logado", () => {
    expect(montarWhereGaleria(usuarioId, { minhaColecao: true })).toEqual({
      capturas: { some: { usuarioId } },
    });
  });

  it("combina todos os filtros ao mesmo tempo", () => {
    const federacaoId = crypto.randomUUID();

    expect(
      montarWhereGaleria(usuarioId, {
        estado: "CE",
        federacaoId,
        empresaJuniorNormalizado: "consultoria",
        minhaColecao: true,
      }),
    ).toEqual({
      empresaJunior: {
        federacaoId,
        federacao: { estado: "CE" },
        nomeNormalizado: { contains: "consultoria" },
      },
      capturas: { some: { usuarioId } },
    });
  });
});
