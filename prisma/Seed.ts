/* eslint-disable no-console */
import { env } from "@/Config/Env";
import { prisma } from "@/Infra/Database/Prisma";
import { seedDirex, type DirexResult } from "@/Infra/Database/Seeds/DirexSeed";
import {
  loadFederacoes,
  seedFederacoes,
} from "@/Infra/Database/Seeds/FederacaoSeed";

const mensagensDirex: Record<DirexResult, string> = {
  criado: "Usuário DIREX criado.",
  promovido: "Usuário existente promovido a DIREX.",
  ja_existia: "Usuário DIREX já existia.",
  ignorado: "SEED_DIREX_* não definidas: usuário DIREX não foi criado.",
};

async function main() {
  const federacoes = await loadFederacoes();
  const total = await seedFederacoes(federacoes);
  console.log(`Federações sincronizadas: ${total}`);

  const resultado = await seedDirex({
    nome: env.SEED_DIREX_NOME,
    email: env.SEED_DIREX_EMAIL,
    senha: env.SEED_DIREX_SENHA,
  });
  console.log(mensagensDirex[resultado]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
