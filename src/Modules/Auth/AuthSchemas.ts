import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(160)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "e-mail inválido");

export const registerBodySchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "o nome deve ter no mínimo 2 caracteres")
    .max(120)
    .refine((valor) => !/[<>]/.test(valor), "o nome não pode conter < ou >"),
  email: emailSchema,
  senha: z
    .string()
    .min(8, "a senha deve ter no mínimo 8 caracteres")
    .max(128, "a senha deve ter no máximo 128 caracteres"),
});

export const loginBodySchema = z.object({
  email: emailSchema,
  senha: z
    .string()
    .min(1, "informe a senha")
    .max(128, "a senha deve ter no máximo 128 caracteres"),
});

export const usuarioPublicoSchema = z.object({
  id: z.uuid(),
  nome: z.string(),
  email: z.string(),
  perfil: z.enum(["MEMBRO", "DIREX"]),
});

export const loginResponseSchema = z.object({
  token: z.string(),
  usuario: usuarioPublicoSchema,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type UsuarioPublico = z.infer<typeof usuarioPublicoSchema>;
