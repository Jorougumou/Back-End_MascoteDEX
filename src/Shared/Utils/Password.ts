import { hash, verify } from "@node-rs/argon2";

export function hashPassword(senha: string): Promise<string> {
  return hash(senha);
}

export async function verifyPassword(
  hashArmazenado: string,
  senha: string,
): Promise<boolean> {
  try {
    return await verify(hashArmazenado, senha);
  } catch {
    return false;
  }
}
