import { execSync } from "node:child_process";
import { assertTestDatabase } from "../Helpers/AssertTestDatabase";

export default function setup(): void {
  assertTestDatabase(process.env.DATABASE_URL);

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  });
}
