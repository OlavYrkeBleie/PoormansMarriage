// Electron main process for Poorman's Marriage.
//
// Starts the embedded Fastify backend on a local loopback port, then
// opens a window pointing at it. No external network.

const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const net = require("node:net");

const isDev = !!process.env.PM_DESKTOP_DEV;

let mainWindow = null;
let backendReady = null;
let backendError = null;
let servePort = null;

function resolveDataDir() {
  const dir = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, "receipts"), { recursive: true });
  return dir;
}

function ensureJwtSecret(dataDir) {
  const p = path.join(dataDir, "jwt-secret");
  if (fs.existsSync(p)) return fs.readFileSync(p, "utf8").trim();
  const secret = require("node:crypto").randomBytes(48).toString("base64url");
  fs.writeFileSync(p, secret, { mode: 0o600 });
  return secret;
}

function pickFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

async function startEmbeddedBackend() {
  const dataDir = resolveDataDir();
  const secret = ensureJwtSecret(dataDir);
  servePort = await pickFreePort();

  process.env.NODE_ENV = "production";
  process.env.DATA_DIR = dataDir;
  process.env.JWT_SECRET = secret;
  process.env.PORT = String(servePort);
  process.env.OCR_LANGS = process.env.OCR_LANGS || "nor+eng";

  // Resolve backend dist based on packaging layout.
  const candidates = [
    // packaged (asarUnpack)
    path.join(process.resourcesPath || "", "app.asar.unpacked", "apps", "backend", "dist", "server.js"),
    path.join(process.resourcesPath || "", "apps", "backend", "dist", "server.js"),
    // running from repo
    path.join(__dirname, "..", "backend", "dist", "server.js"),
    // dev fallback (tsx will have built anyway)
    path.join(__dirname, "..", "..", "apps", "backend", "dist", "server.js"),
  ];
  const backendEntry = candidates.find((p) => p && fs.existsSync(p));
  if (!backendEntry) {
    throw new Error(`Could not find backend entry. Searched:\n  ${candidates.join("\n  ")}`);
  }

  // Fastify binds and returns from server.ts' main(); import it synchronously.
  await require(backendEntry);
}

function createWindow() {
  const iconPath = path.join(__dirname, "build", "icon.png");
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#edeff3",
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Open external links in the user's default browser, not a new Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  const target = isDev ? "http://localhost:5173/" : `http://127.0.0.1:${servePort}/`;
  mainWindow.loadURL(target);

  mainWindow.on("closed", () => { mainWindow = null; });
}

app.setAppUserModelId("com.olavyrkebleie.poormansmarriage");

// Single-instance: second launch focuses the first window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    try {
      if (!isDev) {
        backendReady = startEmbeddedBackend();
        await backendReady;
      } else {
        servePort = 3100; // dev mode: expects you to already be running `npm run dev` in the repo
      }
      createWindow();
    } catch (err) {
      backendError = err;
      dialog.showErrorBox(
        "Poorman's Marriage failed to start",
        `${err.message}\n\nData directory: ${app.getPath("userData")}`,
      );
      app.quit();
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
