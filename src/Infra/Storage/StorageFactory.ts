import { createClient } from "@supabase/supabase-js";
import type { Env } from "@/Config/EnvSchema";
import { AppError } from "@/Shared/Errors/AppError";
import { ErrorCodes } from "@/Shared/Errors/ErrorCodes";
import type { StorageProvider } from "./StorageProvider";
import { createSupabaseStorage } from "./SupabaseStorage";

type StorageEnv = Pick<
  Env,
  "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY" | "SUPABASE_BUCKET"
>;

function createStorageNaoConfigurado(): StorageProvider {
  const falhar = async (): Promise<never> => {
    throw new AppError(
      ErrorCodes.ERRO_STORAGE,
      502,
      "Armazenamento de imagens não configurado.",
    );
  };

  return { upload: falhar, remove: falhar };
}

export function createStorage(env: StorageEnv): StorageProvider {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return createStorageNaoConfigurado();
  }

  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  return createSupabaseStorage({
    bucket: env.SUPABASE_BUCKET,
    bucketClient: client.storage.from(env.SUPABASE_BUCKET),
  });
}
