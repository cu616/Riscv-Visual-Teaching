import { app, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";

const isDev = process.env.VITE_DEV_SERVER_URL || process.env.NODE_ENV === "development";

function writeRuntimeLog(message: string) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  const candidates = [
    () => path.join(app.getPath("userData"), "runtime.log"),
    () => path.join(process.resourcesPath || process.cwd(), "runtime.log"),
    () => path.join(process.cwd(), "runtime.log")
  ];
  try {
    for (const getPath of candidates) {
      try {
        fs.appendFileSync(getPath(), line, "utf8");
      } catch {
        // Try the next location.
      }
    }
  } catch {
    // Ignore logging failures; the app should keep booting.
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    title: "RISC-V 指令集可视化教学软件",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    writeRuntimeLog(`did-fail-load ${errorCode} ${errorDescription} ${validatedURL}`);
  });
  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    writeRuntimeLog(`console level=${level} ${sourceId}:${line} ${message}`);
  });
  win.webContents.on("render-process-gone", (_event, details) => {
    writeRuntimeLog(`render-process-gone ${details.reason} exitCode=${details.exitCode}`);
  });
  win.webContents.on("did-finish-load", () => {
    writeRuntimeLog(`did-finish-load ${win.webContents.getURL()}`);
  });

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5173");
    win.webContents.openDevTools({ mode: "detach" });
    return;
  }

  const indexPath = path.join(__dirname, "../dist/index.html");
  writeRuntimeLog(`loading ${indexPath}`);
  win.loadFile(indexPath);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
