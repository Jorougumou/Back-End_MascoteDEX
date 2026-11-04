import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/Server.ts"],
  format: ["esm"],
  target: "node22",
  clean: true,
  sourcemap: true,
});
