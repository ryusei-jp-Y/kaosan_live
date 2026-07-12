const { app, BrowserWindow, dialog, ipcMain, net, protocol } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

let controlWindow;
let avatarWindow;

const isDev = !app.isPackaged;
const devUrl = "http://127.0.0.1:5173";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "kaosan-file",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  }
]);

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function defaultSettings() {
  return {
    app: { version: "0.1.0" },
    canvas: { width: 1280, height: 720, fps: 60, backgroundColor: "#00ff00" },
    image: { path: "", x: 640, y: 360, scale: 1, rotation: 0 },
    mouth: {
      x: 640,
      y: 430,
      width: 120,
      height: 58,
      strokeColor: "#241a1a",
      strokeWidth: 8,
      patchWidth: 160,
      patchHeight: 88,
      patchColor: "#ffffff",
      sensitivity: 1.15,
      noiseGate: 0.04,
      maxOpen: 1,
      minOpen: 0,
      openSpeed: 0.65,
      closeSpeed: 0.28,
      smoothing: 0.72,
      jitter: 0.08
    },
    eyes: {
      leftX: 585,
      leftY: 330,
      rightX: 695,
      rightY: 330,
      width: 56,
      patchHeight: 42,
      strokeColor: "#241a1a",
      strokeWidth: 7
    },
    blink: {
      enabled: true,
      minInterval: 3,
      maxInterval: 7,
      duration: 0.18,
      doubleBlinkChance: 0.12
    },
    motion: {
      idleBobAmount: 1.5,
      idleBobSpeed: 0.6,
      talkBounceAmount: 2.5,
      talkBounceSpeed: 1.2,
      blinkDipAmount: 1,
      jitterAmount: 0.08
    },
    output: {
      alwaysOnTop: false,
      fullscreen: false,
      debug: false,
      showControlUi: true
    }
  };
}

function mergeSettings(settings = {}) {
  const base = defaultSettings();
  return {
    ...base,
    ...settings,
    app: { ...base.app, ...(settings.app || {}) },
    canvas: { ...base.canvas, ...(settings.canvas || {}) },
    image: { ...base.image, ...(settings.image || {}) },
    mouth: { ...base.mouth, ...(settings.mouth || {}) },
    eyes: { ...base.eyes, ...(settings.eyes || {}) },
    blink: { ...base.blink, ...(settings.blink || {}) },
    motion: { ...base.motion, ...(settings.motion || {}) },
    output: { ...base.output, ...(settings.output || {}) }
  };
}

function readSettings() {
  try {
    const file = settingsPath();
    if (!fs.existsSync(file)) return defaultSettings();
    return mergeSettings(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return defaultSettings();
  }
}

function writeSettings(settings) {
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(mergeSettings(settings), null, 2));
}

function applyAvatarWindowSettings(win, settings) {
  const next = mergeSettings(settings);
  const width = Number(next.canvas.width) || 1280;
  const height = Number(next.canvas.height) || 720;
  const fullscreen = Boolean(next.output.fullscreen);
  win.setAlwaysOnTop(Boolean(next.output.alwaysOnTop));
  win.setBackgroundColor(next.canvas.backgroundColor);
  if (!fullscreen) {
    if (win.isFullScreen()) win.setFullScreen(false);
    const [currentWidth, currentHeight] = win.getSize();
    if (currentWidth !== width || currentHeight !== height) win.setSize(width, height);
  } else {
    const [currentWidth, currentHeight] = win.getSize();
    if (currentWidth !== width || currentHeight !== height) win.setSize(width, height);
    if (!win.isFullScreen()) win.setFullScreen(true);
  }
}

async function handleLocalImageRequest(request) {
  try {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.pathname.slice(1));
    const extension = path.extname(filePath).toLowerCase();
    if (![".png", ".jpg", ".jpeg"].includes(extension)) {
      return new Response("Unsupported image type", { status: 415 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  } catch {
    return new Response("Image not found", { status: 404 });
  }
}

function loadWindow(win, page) {
  if (isDev) {
    win.loadURL(`${devUrl}/${page}.html`);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", `${page}.html`));
  }
}

function createControlWindow() {
  controlWindow = new BrowserWindow({
    title: "Kaosan Live Control",
    width: 1180,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  loadWindow(controlWindow, "control");
  controlWindow.on("closed", () => {
    controlWindow = undefined;
  });
}

function createAvatarWindow(settings = readSettings()) {
  if (avatarWindow && !avatarWindow.isDestroyed()) {
    applyAvatarWindowSettings(avatarWindow, settings);
    avatarWindow.webContents.send("settings:updated", mergeSettings(settings));
    avatarWindow.focus();
    return;
  }
  const merged = mergeSettings(settings);
  avatarWindow = new BrowserWindow({
    title: "Kaosan Live Avatar",
    width: merged.canvas.width,
    height: merged.canvas.height,
    backgroundColor: merged.canvas.backgroundColor,
    alwaysOnTop: merged.output.alwaysOnTop,
    fullscreen: merged.output.fullscreen,
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  loadWindow(avatarWindow, "avatar");
  avatarWindow.on("closed", () => {
    avatarWindow = undefined;
  });
}

app.whenReady().then(() => {
  protocol.handle("kaosan-file", handleLocalImageRequest);
  createControlWindow();

  ipcMain.handle("settings:load", () => readSettings());
  ipcMain.handle("settings:save", (_event, settings) => {
    const merged = mergeSettings(settings);
    writeSettings(merged);
    if (avatarWindow && !avatarWindow.isDestroyed()) {
      applyAvatarWindowSettings(avatarWindow, merged);
      avatarWindow.webContents.send("settings:updated", merged);
    }
    return { ok: true, path: settingsPath() };
  });
  ipcMain.handle("dialog:openImage", async () => {
    const result = await dialog.showOpenDialog(controlWindow, {
      title: "線画イラストを選択",
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg"] }]
    });
    return result.canceled ? "" : result.filePaths[0];
  });
  ipcMain.handle("dialog:openSettings", async () => {
    const result = await dialog.showOpenDialog(controlWindow, {
      title: "設定JSONを読み込み",
      properties: ["openFile"],
      filters: [{ name: "Kaosan Live Settings", extensions: ["json"] }]
    });
    if (result.canceled) return null;
    try {
      return mergeSettings(JSON.parse(fs.readFileSync(result.filePaths[0], "utf8")));
    } catch {
      dialog.showErrorBox("設定を読み込めません", "JSONファイルの形式を確認してください。");
      return null;
    }
  });
  ipcMain.handle("dialog:saveSettingsAs", async (_event, settings) => {
    const result = await dialog.showSaveDialog(controlWindow, {
      title: "設定JSONを保存",
      defaultPath: "kaosan-live-settings.json",
      filters: [{ name: "Kaosan Live Settings", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePath) return "";
    fs.writeFileSync(result.filePath, JSON.stringify(mergeSettings(settings), null, 2));
    return result.filePath;
  });
  ipcMain.handle("avatar:open", (_event, settings) => {
    const merged = mergeSettings(settings);
    writeSettings(merged);
    createAvatarWindow(merged);
    return true;
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (!controlWindow) createControlWindow();
});
