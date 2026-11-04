import { config } from "dotenv";
import { parseEnv, type Env } from "./EnvSchema";

config({
  path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
  quiet: true,
});

function loadEnv(): Env {
  try {
    return parseEnv(process.env);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}

export const env = loadEnv();
