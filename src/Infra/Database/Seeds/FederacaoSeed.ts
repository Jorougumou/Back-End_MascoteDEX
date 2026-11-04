import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { prisma } from "@/Infra/Database/Prisma";

const federacoesSchema = z.array(
  z.object({
    nome: z.string().min(1).max(120),
    sigla: z.string().min(1).max(20),
    estado: z.string().length(2),
    regiao: z.string().min(1).max(20),
  }),
);

export type FederacaoSeed = z.infer<typeof federacoesSchema>[number];

export async function loadFederacoes(
  path = resolve(process.cwd(), "prisma/Data/Federacoes.json"),
): Promise<FederacaoSeed[]> {
  const conteudo = await readFile(path, "utf-8");
  return federacoesSchema.parse(JSON.parse(conteudo));
}

export async function seedFederacoes(
  federacoes: FederacaoSeed[],
): Promise<number> {
  await prisma.$transaction(
    federacoes.map((federacao) =>
      prisma.federacao.upsert({
        where: { sigla: federacao.sigla },
        update: {
          nome: federacao.nome,
          estado: federacao.estado,
          regiao: federacao.regiao,
        },
        create: federacao,
      }),
    ),
  );

  return federacoes.length;
}
