import { Perfil } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/Infra/Database/Prisma";
import { hashPassword } from "@/Shared/Utils/Password";

const direxSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(160)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "e-mail inválido"),
  senha: z.string().min(8, "a senha deve ter no mínimo 8 caracteres"),
});

export interface DirexInput {
  nome?: string;
  email?: string;
  senha?: string;
}

export type DirexResult = "criado" | "promovido" | "ja_existia" | "ignorado";

export async function seedDirex(input: DirexInput): Promise<DirexResult> {
  if (!input.nome || !input.email || !input.senha) {
    return "ignorado";
  }

  const dados = direxSchema.parse(input);

  const existente = await prisma.usuario.findUnique({
    where: { email: dados.email },
  });

  if (existente) {
    if (existente.perfil === Perfil.DIREX) {
      return "ja_existia";
    }

    await prisma.usuario.update({
      where: { id: existente.id },
      data: { perfil: Perfil.DIREX },
    });
    return "promovido";
  }

  await prisma.usuario.create({
    data: {
      nome: dados.nome,
      email: dados.email,
      senhaHash: await hashPassword(dados.senha),
      perfil: Perfil.DIREX,
    },
  });

  return "criado";
}
