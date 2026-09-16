#!/usr/bin/env node
/**
 * Nitro's Vercel pack puts PGlite's JS next to `_libs/` but drops the
 * wasm/data files. The shop engine needs those files beside the module.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "node_modules/@electric-sql/pglite/dist");
const DEST = join(ROOT, ".vercel/output/functions/__server.func/_libs");
const FILES = ["pglite.wasm", "pglite.data", "initdb.wasm"];

if (!existsSync(join(SRC, "pglite.data"))) {
  console.warn("[pglite] package files missing — skip");
  process.exit(0);
}
if (!existsSync(DEST)) {
  console.warn("[pglite] no server bundle yet — skip");
  process.exit(0);
}

mkdirSync(DEST, { recursive: true });
for (const name of FILES) {
  copyFileSync(join(SRC, name), join(DEST, name));
}
console.log("[pglite] packed wasm/data next to the shop engine");
