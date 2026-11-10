import { prisma } from "@/Infra/Database/Prisma";
import { normalizarTexto } from "@/Shared/Utils/Normalize";
import type { setupIntegration } from "./SetupIntegration";

type TestApp = Awaited<ReturnType<typeof setupIntegration>>;

const SENHA = "senha-segura-123";

export async function criarUsuarioComToken(
  app: TestApp,
  perfil: "MEMBRO" | "DIREX" = "MEMBRO",
  email = `${perfil.toLowerCase()}@email.com`,
) {
  await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { nome: "Usuário Teste", email, senha: SENHA },
  });

  if (perfil === "DIREX") {
    await prisma.usuario.update({ where: { email }, data: { perfil } });
  }

  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, senha: SENHA },
  });
  const corpo = login.json();

  return {
    id: corpo.usuario.id as string,
    token: corpo.token as string,
    headers: { authorization: `Bearer ${corpo.token as string}` },
  };
}

export function criarFederacao(
  dados: {
    nome?: string;
    sigla?: string;
    estado?: string;
    regiao?: string;
  } = {},
) {
  return prisma.federacao.create({
    data: {
      nome: dados.nome ?? "Federação Teste",
      sigla: dados.sigla ?? "FT",
      estado: dados.estado ?? "SP",
      regiao: dados.regiao ?? "Sudeste",
    },
  });
}

export function criarEmpresaJunior(
  federacaoId: string,
  dados: { nome?: string; universidade?: string } = {},
) {
  const nome = dados.nome ?? "EJ Teste";
  return prisma.empresaJunior.create({
    data: {
      nome,
      nomeNormalizado: normalizarTexto(nome),
      universidade: dados.universidade ?? "USP",
      federacaoId,
    },
  });
}

export function criarEvento(
  usuarioId: string,
  dados: { nome?: string; local?: string } = {},
) {
  return prisma.evento.create({
    data: {
      nome: dados.nome ?? "Evento Teste",
      local: dados.local ?? "Fortaleza",
      dataInicio: new Date("2026-11-10T00:00:00.000Z"),
      dataFim: new Date("2026-11-12T00:00:00.000Z"),
      usuarioId,
    },
  });
}

export function criarMascote(
  usuarioId: string,
  empresaJuniorId: string,
  nome = "Mascote Teste",
) {
  return prisma.mascote.create({
    data: {
      nome,
      nomeNormalizado: normalizarTexto(nome),
      fotoUrl: "https://exemplo.com/mascote.jpg",
      empresaJuniorId,
      usuarioId,
    },
  });
}

export function criarCaptura(dados: {
  usuarioId: string;
  mascoteId: string;
  eventoId: string;
  capturadoEm: string;
}) {
  return prisma.captura.create({
    data: {
      usuarioId: dados.usuarioId,
      mascoteId: dados.mascoteId,
      eventoId: dados.eventoId,
      fotoUrl: "https://exemplo.com/captura.jpg",
      capturadoEm: new Date(dados.capturadoEm),
    },
  });
}
