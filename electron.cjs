const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;
let currentState = null;

function getSavePath() {
   return path.join(app.getPath("userData"), "creature-save.json");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: "Creature",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs")
    },
  });

  const isDev = process.env.VITE_DEV_SERVER_URL;

  if (isDev) {
    mainWindow.loadURL(isDev);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC Handlers for State Persistence
ipcMain.handle("load-state", async () => {
  try {
    const savePath = getSavePath();
    if (fs.existsSync(savePath)) {
      return fs.readFileSync(savePath, "utf8");
    }
  } catch (err) {
    console.error("Failed to load generic state", err);
  }
  return null;
});

ipcMain.on("save-state", (event, dataStr) => {
  currentState = dataStr;
});

// Auto-save logic
setInterval(() => {
  if (currentState) {
    fs.writeFileSync(getSavePath(), currentState);
  }
}, 30000);

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (currentState) {
    fs.writeFileSync(getSavePath(), currentState);
  }
});
