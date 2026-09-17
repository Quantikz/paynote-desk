#!/usr/bin/env node
"use strict";

const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const PORT = Number(process.env.PAYNOTE_PORT || process.env.PORT || 8080);
const HOST = "0.0.0.0";

let child = null;
let win = null;

function rootDir() {
  // desktop/main.cjs lives next to scripts/ whether we are running from source
  // or from the unpacked linux folder (asar is off).
  return path.join(__dirname, "..");
}

function dataDir() {
  const fromEnv = process.env.PAYNOTE_DATA?.trim();
  if (fromEnv) return fromEnv;
  return path.join(app.getPath("userData"), "database");
}

function lanUrls() {
  const urls = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list ?? []) {
      const family = String(net.family);
      if (net.internal) continue;
      if (family !== "IPv4" && family !== "4") continue;
      if (String(net.address).startsWith("169.254.")) continue;
      urls.push(`http://${net.address}:${PORT}`);
    }
  }
  urls.sort((a, b) => Number(b.includes("192.168.")) - Number(a.includes("192.168.")));
  return urls;
}

function openPrivateNetwork() {
  if (process.platform !== "win32") return;
  const { execFile } = require("node:child_process");
  execFile(
    "netsh",
    [
      "advfirewall",
      "firewall",
      "add",
      "rule",
      "name=Paynote Store",
      "dir=in",
      "action=allow",
      "protocol=TCP",
      `localport=${PORT}`,
      "profile=private",
    ],
    () => {},
  );
}

function waitForServer(timeoutMs = 60000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get({ host: "127.0.0.1", port: PORT, path: "/", timeout: 1500 }, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) reject(new Error("Paynote did not start in time."));
        else setTimeout(tick, 250);
      });
      req.on("timeout", () => {
        req.destroy();
        if (Date.now() - started > timeoutMs) reject(new Error("Paynote did not start in time."));
        else setTimeout(tick, 250);
      });
    };
    tick();
  });
}

function alreadyUp() {
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

function startServer() {
  fs.mkdirSync(dataDir(), { recursive: true });
  const entry = path.join(rootDir(), "scripts", "start-store.mjs");
  if (!fs.existsSync(entry)) {
    dialog.showErrorBox("Paynote", "The shop engine is missing. Reinstall Paynote.");
    app.quit();
    return;
  }
  child = spawn(process.execPath, [entry], {
    cwd: rootDir(),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PAYNOTE_LOCAL: "1",
      PAYNOTE_DATA: dataDir(),
      PORT: String(PORT),
      PAYNOTE_PORT: String(PORT),
      HOST,
      DATABASE_URL: "",
      VERCEL: "",
    },
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    if (code && code !== 0 && win) {
      dialog.showErrorBox("Paynote", "The shop engine stopped. Open Paynote again.");
    }
  });
}

function buildMenu() {
  const urls = lanUrls();
  const wifi = urls.length ? urls.join("\n") : "Connect this computer to Wi‑Fi first.";
  const template = [
    {
      label: "Paynote",
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Wi‑Fi address",
          click: () => {
            dialog.showMessageBox(win, {
              type: "info",
              title: "On this Wi‑Fi",
              message: "Phones on the same network open this address, then the store password.",
              detail: `${wifi}\n\nDatabase folder:\n${dataDir()}\n\nDefault password: 1234`,
            });
          },
        },
        {
          label: "Database folder",
          click: () => shell.openPath(dataDir()),
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#f3efe6",
    autoHideMenuBar: false,
    title: "Paynote",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.once("ready-to-show", () => win?.show());
  win.on("closed", () => {
    win = null;
  });
  await win.loadURL(`http://127.0.0.1:${PORT}/`);
}

app.setName("Paynote");
app.setPath("userData", process.env.PAYNOTE_HOME?.trim() || path.join(app.getPath("appData"), "Paynote"));

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    buildMenu();
    const up = await alreadyUp();
    if (!up) startServer();
    openPrivateNetwork();
    try {
      await waitForServer(up ? 5000 : 90000);
      await createWindow();
    } catch (err) {
      dialog.showErrorBox("Paynote", err instanceof Error ? err.message : "Could not open the shop window.");
      app.quit();
    }
  });

  app.on("window-all-closed", () => {
    if (child && !child.killed) child.kill("SIGTERM");
    app.quit();
  });

  app.on("before-quit", () => {
    if (child && !child.killed) child.kill("SIGTERM");
  });
}
