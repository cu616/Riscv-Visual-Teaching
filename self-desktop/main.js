const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

try {
  fs.appendFileSync(
    path.join(__dirname, "self-desktop-main-entry.log"),
    `[${new Date().toISOString()}] main.js entered\n`,
    "utf8"
  );
} catch {
  // Ignore earliest logging failures.
}

function writeRuntimeLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  const locations = [
    () => path.join(app.getPath("userData"), "self-desktop-runtime.log"),
    () => path.join(process.cwd(), "self-desktop-runtime.log")
  ];

  for (const getPath of locations) {
    try {
      fs.appendFileSync(getPath(), line, "utf8");
      return;
    } catch {
      // Try the next location.
    }
  }
}

function resolveAppIndex() {
  return path.join(__dirname, "..", "app", "index.html");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    title: "RISC-V 指令集可视化教学软件 - 自研积木版",
    backgroundColor: "#f6f7fb",
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

  const indexPath = resolveAppIndex();
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
