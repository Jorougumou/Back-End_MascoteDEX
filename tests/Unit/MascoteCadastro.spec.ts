import { describe, expect, it, vi } from "vitest";
import type { StorageProvider } from "@/Infra/Storage/StorageProvider";
import {
  createMascoteService,
  type CadastrarMascoteEntrada,
} from "@/Modules/Mascotes/MascoteService";
import { repositorioBase } from "../Helpers/MascoteFakes";
import type {
  CadastrarComCapturaArgs,
  MascoteRepository,
  PerfilMascoteRegistro,
} from "@/Modules/Mascotes/MascoteRepository";
import type { CadastrarMascoteCampos } from "@/Modules/Mascotes/MascoteSchemas";
import { loggerNulo } from "@/Shared/Utils/Logger";

const USUARIO_ID = "usuario-1";
const EVENTO_ID = "evento-1";
const EJ_ID = "ej-1";
const FEDERACAO_ID = "federacao-1";
const FOTO = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

function perfil(id = "mascote-1"): PerfilMascoteRegistro {
  return {
    id,
    nome: "Leão",
    fotoUrl: "https://storage.test/mascotes/leao.jpg",
    capturado: true,
    empresaJunior: {
      id: EJ_ID,
      nome: "Júnior Teste",
      universidade: "UFC",
      curiosidades: null,
      federacao: {
        nome: "Federação Teste",
        sigla: "FT",
        estado: "CE",
        regiao: "Nordeste",
      },
    },
    eventos: [],
  };
}

function entrada(
  empresaJunior: CadastrarMascoteCampos["empresaJunior"] = {
    tipo: "existente",
    id: EJ_ID,
  },
): CadastrarMascoteEntrada {
  return {
    usuarioId: USUARIO_ID,
    foto: FOTO,
    dados: {
      nome: "Leão",
      eventoId: EVENTO_ID,
      capturadoEm: new Date("2026-11-08T12:00:00.000Z"),
      empresaJunior,
    },
  };
}

function criarCenario() {
  const argsCadastro: CadastrarComCapturaArgs[] = [];
  const upload = vi.fn(async () => "https://storage.test/mascotes/leao.jpg");
  const remove = vi.fn(async () => undefined);
  const buscarPerfil = vi.fn(async () => perfil());
  const cadastrarComCaptura = vi.fn(async (args: CadastrarComCapturaArgs) => {
    argsCadastro.push(args);
    return { mascoteId: "mascote-1" };
  });
  const repository: MascoteRepository = {
    ...repositorioBase(),
    eventoExiste: vi.fn(async () => true),
    empresaJuniorExiste: vi.fn(async () => true),
    federacaoExiste: vi.fn(async () => true),
    buscarMascotePorNome: vi.fn(async () => null),
    buscarEmpresaJuniorPorNome: vi.fn(async () => null),
    buscarEmpresasJunioresSimilares: vi.fn(async () => []),
    cadastrarComCaptura,
    buscarPerfil,
  };
  const storage: StorageProvider = { upload, remove };
  const service = createMascoteService({
    mascoteRepository: repository,
    storage,
    logger: loggerNulo,
    agora: () => new Date("2026-11-08T12:00:00.000Z"),
  });

  return {
    service,
    repository,
    storage,
    upload,
    remove,
    buscarPerfil,
    cadastrarComCaptura,
    argsCadastro,
  };
}

describe("RF003/RN009 — cadastro de mascote", () => {
  it("cadastra mascote em EJ existente e registra a primeira captura com a mesma foto", async () => {
    const c = criarCenario();

    const resposta = await c.service.cadastrar(entrada());

    expect(resposta.id).toBe("mascote-1");
    expect(c.upload).toHaveBeenCalledOnce();
    expect(c.upload).toHaveBeenCalledWith(
      FOTO,
      "image/jpeg",
      expect.stringMatching(/^mascotes\/[0-9a-f-]+\.jpg$/),
    );
    expect(c.argsCadastro[0]).toMatchObject({
      empresaJunior: { tipo: "existente", id: EJ_ID },
      mascote: {
        nome: "Leão",
        nomeNormalizado: "leao",
        fotoUrl: "https://storage.test/mascotes/leao.jpg",
        usuarioId: USUARIO_ID,
      },
      captura: {
        eventoId: EVENTO_ID,
        capturadoEm: new Date("2026-11-08T12:00:00.000Z"),
      },
    });
    expect(c.buscarPerfil).toHaveBeenCalledWith("mascote-1", USUARIO_ID);
    expect(c.remove).not.toHaveBeenCalled();
  });

  it("prepara a criação de EJ nova com nome normalizado e curiosidades opcionais", async () => {
    const c = criarCenario();

    await c.service.cadastrar(
      entrada({
        tipo: "nova",
        nome: "  Júnior   Ceará ",
        universidade: "UFC",
        federacaoId: FEDERACAO_ID,
        curiosidades: undefined,
        confirmarSimilares: true,
      }),
    );

    expect(c.argsCadastro[0]?.empresaJunior).toEqual({
      tipo: "nova",
      dados: {
        nome: "  Júnior   Ceará ",
        nomeNormalizado: "junior ceara",
        universidade: "UFC",
        curiosidades: null,
        federacaoId: FEDERACAO_ID,
      },
    });
  });

  it("rejeita evento inexistente antes de consultar EJ ou enviar foto", async () => {
    const c = criarCenario();
    vi.mocked(c.repository.eventoExiste).mockResolvedValue(false);

    await expect(c.service.cadastrar(entrada())).rejects.toMatchObject({
      code: "NAO_ENCONTRADO",
      statusCode: 404,
      message: "Evento não encontrado.",
    });
    expect(c.repository.empresaJuniorExiste).not.toHaveBeenCalled();
    expect(c.upload).not.toHaveBeenCalled();
  });

  it("rejeita EJ existente inexistente antes do upload", async () => {
    const c = criarCenario();
    vi.mocked(c.repository.empresaJuniorExiste).mockResolvedValue(false);

    await expect(c.service.cadastrar(entrada())).rejects.toMatchObject({
      code: "NAO_ENCONTRADO",
      statusCode: 404,
    });
    expect(c.repository.buscarMascotePorNome).not.toHaveBeenCalled();
    expect(c.upload).not.toHaveBeenCalled();
  });

  it("impede mascote duplicado na mesma EJ antes do upload (RN005)", async () => {
    const c = criarCenario();
    vi.mocked(c.repository.buscarMascotePorNome).mockResolvedValue({
      id: "mascote-existente",
    });

    await expect(c.service.cadastrar(entrada())).rejects.toMatchObject({
      code: "MASCOTE_JA_CADASTRADO",
      statusCode: 409,
      details: { mascoteId: "mascote-existente" },
    });
    expect(c.upload).not.toHaveBeenCalled();
    expect(c.cadastrarComCaptura).not.toHaveBeenCalled();
  });

  it("impede EJ duplicada na federação antes do upload (RN006)", async () => {
    const c = criarCenario();
    vi.mocked(c.repository.buscarEmpresaJuniorPorNome).mockResolvedValue({
      id: "ej-existente",
    });

    await expect(
      c.service.cadastrar(
        entrada({
          tipo: "nova",
          nome: "Júnior Ceará",
          universidade: "UFC",
          federacaoId: FEDERACAO_ID,
          curiosidades: undefined,
          confirmarSimilares: false,
        }),
      ),
    ).rejects.toMatchObject({ code: "EJ_DUPLICADA", statusCode: 409 });
    expect(c.upload).not.toHaveBeenCalled();
  });

  it("solicita confirmação quando encontra EJ com nome semelhante", async () => {
    const c = criarCenario();
    vi.mocked(c.repository.buscarEmpresasJunioresSimilares).mockResolvedValue([
      {
        id: "ej-similar",
        nome: "Júnior Ceará Tech",
        universidade: "UFC",
        federacaoId: FEDERACAO_ID,
      },
    ]);

    await expect(
      c.service.cadastrar(
        entrada({
          tipo: "nova",
          nome: "Júnior Ceará",
          universidade: "UFC",
          federacaoId: FEDERACAO_ID,
          curiosidades: undefined,
          confirmarSimilares: false,
        }),
      ),
    ).rejects.toMatchObject({
      code: "EJ_SIMILARES_ENCONTRADAS",
      statusCode: 409,
      details: { sugestoes: [{ id: "ej-similar" }] },
    });
    expect(c.upload).not.toHaveBeenCalled();
  });

  it("não grava no banco se o upload falhar", async () => {
    const c = criarCenario();
    c.upload.mockRejectedValue(new Error("storage indisponível"));

    await expect(c.service.cadastrar(entrada())).rejects.toThrow(
      "storage indisponível",
    );
    expect(c.cadastrarComCaptura).not.toHaveBeenCalled();
    expect(c.remove).not.toHaveBeenCalled();
  });

  it("remove a foto enviada se a transação do banco falhar (RN015)", async () => {
    const c = criarCenario();
    c.cadastrarComCaptura.mockRejectedValue(new Error("falha no banco"));

    await expect(c.service.cadastrar(entrada())).rejects.toThrow(
      "falha no banco",
    );
    expect(c.upload).toHaveBeenCalledOnce();
    expect(c.remove).toHaveBeenCalledWith(
      "https://storage.test/mascotes/leao.jpg",
    );
    expect(c.buscarPerfil).not.toHaveBeenCalled();
  });

  it("preserva o erro do banco mesmo se a compensação do Storage falhar", async () => {
    const c = criarCenario();
    c.cadastrarComCaptura.mockRejectedValue(new Error("falha no banco"));
    c.remove.mockRejectedValue(new Error("falha ao remover"));

    await expect(c.service.cadastrar(entrada())).rejects.toThrow(
      "falha no banco",
    );
  });
});
