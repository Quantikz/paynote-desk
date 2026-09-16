#!/usr/bin/env node
/**
 * Local shop engine. Binds every network interface so phones on the same
 * Wi‑Fi can open Paynote with the store password. Database files live in
 * PAYNOTE_DATA (or ./data/paynote). Runs without a system Node install when
 * launched from the Paynote window (Electron as Node).
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import http from "node:http";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PAYNOTE_PORT || process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";
const NODE = process.execPath;
const WRAPPER = join(ROOT, "scripts/with-app-env.mjs");
const VITE_JS = join(ROOT, "node_modules/vite/bin/vite.js");

function dataDir() {
  const fromEnv = process.env.PAYNOTE_DATA?.trim();
  const dir = fromEnv || join(ROOT, "data", "paynote");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function lanUrls() {
  const urls = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family !== "IPv4" || net.internal) continue;
      urls.push(`http://${net.address}:${PORT}`);
    }
  }
  return urls;
}

function listening() {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port: PORT, path: "/", timeout: 800 }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function printBanner() {
  const urls = lanUrls();
  console.log("");
  console.log("  Paynote is open on this computer.");
  console.log(`  Database: ${dataDir()}`);
  console.log(`  This screen: http://127.0.0.1:${PORT}/`);
  if (urls.length) {
    console.log("  Phones on this Wi‑Fi:");
    for (const url of urls) console.log(`    ${url}`);
  } else {
    console.log("  Connect Wi‑Fi to share the shop with phones.");
  }
  console.log("  Store password default: 1234");
  console.log("");
}

function runVite(mode) {
  if (!existsSync(VITE_JS)) {
    console.error("Paynote is missing its engine files. Reinstall the program.");
    process.exit(1);
  }
  const args = [WRAPPER, NODE, VITE_JS, mode, "--host", HOST, "--port", String(PORT)];
  if (mode === "preview") args.push("--strictPort");
  const child = spawn(NODE, args, {
    cwd: ROOT,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PAYNOTE_DATA: dataDir(),
      PORT: String(PORT),
      PAYNOTE_PORT: String(PORT),
      HOST,
    },
    stdio: "inherit",
  });
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => {
      if (!child.killed) child.kill(signal);
    });
  }
  child.on("exit", (code) => process.exit(code ?? 0));
  return child;
}

if (await listening()) {
  printBanner();
  process.exit(0);
}

dataDir();
const built =
  existsSync(join(ROOT, ".vercel/output/static/index.html")) ||
  existsSync(join(ROOT, "dist/client/index.html"));
printBanner();
runVite(built ? "preview" : "dev");
