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
