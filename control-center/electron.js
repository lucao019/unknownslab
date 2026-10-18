/* =========================================================
   UNKNOWNS LAB — Control Center
   Processo Main do Electron
========================================================= */

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");

const isDev = process.argv.includes("--dev");

let mainWindow   = null;
let kbOverlay    = null;  // janela overlay do Keyboard Visualizer

/* ── Serviços (carregados sob demanda) ─────────────────── */
const kbService = require("./src/services/keyboard-visualizer.js");


/* ---------------------------------------------------------
   JANELA PRINCIPAL
--------------------------------------------------------- */

function createMainWindow() {

    mainWindow = new BrowserWindow({
        width: 1100,
        height: 720,
        minWidth: 900,
        minHeight: 600,

        frame: false,
        transparent: false,
        backgroundColor: "#0d0d0f",

        title: "Unknowns Lab — Control Center",

        icon: path.join(__dirname, "src", "assets", "icon.ico"),

        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: isDev
        }
    });

    mainWindow.loadFile(
        path.join(__dirname, "src", "index.html")
    );

    if (isDev) {
        mainWindow.webContents.openDevTools({ mode: "detach" });
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}


/* ---------------------------------------------------------
   JANELA OVERLAY — KEYBOARD VISUALIZER
   Transparente, sem borda, sempre no topo.
--------------------------------------------------------- */

function createKbOverlay() {

    kbOverlay = new BrowserWindow({
        width: 400,
        height: 230,

        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,

        /* Posição padrão: canto inferior esquerdo */
        x: 20,
        y: 820,

        title: "Unknowns Lab — Keyboard",

        webPreferences: {
            preload: path.join(__dirname, "src", "overlay", "keyboard-preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: isDev
        }
    });

    kbOverlay.loadFile(
        path.join(__dirname, "src", "overlay", "keyboard.html")
    );

    kbOverlay.on("closed", () => {
        kbOverlay = null;
    });

    /* Registra callback para enviar eventos de tecla para a overlay */
    kbService.setKeyEventCallback((event) => {
        if (kbOverlay && !kbOverlay.isDestroyed()) {
            kbOverlay.webContents.send("key-event", event);
        }
    });
}


/* ---------------------------------------------------------
   IPC — CONTROLES DA JANELA PRINCIPAL
--------------------------------------------------------- */

ipcMain.on("window:minimize", () => mainWindow?.minimize());

ipcMain.on("window:maximize", () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
});

ipcMain.on("window:close", () => mainWindow?.close());

ipcMain.on("shell:open-external", (_e, url) => shell.openExternal(url));


/* ---------------------------------------------------------
   IPC — MÓDULOS
   O renderer envia "module:start" / "module:stop"
   e recebe "module:state" com o novo estado.
--------------------------------------------------------- */

ipcMain.handle("module:start", async (_e, id) => {
    try {
        if (id === "keyboard-visualizer") {
            createKbOverlay();
            await kbService.start();
        }
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

ipcMain.handle("module:stop", async (_e, id) => {
    try {
        if (id === "keyboard-visualizer") {
            await kbService.stop();
            if (kbOverlay && !kbOverlay.isDestroyed()) {
                kbOverlay.close();
            }
        }
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

ipcMain.handle("module:status", (_e, id) => {
    if (id === "keyboard-visualizer") {
        return kbService.getStatus();
    }
    return null;
});


/* ---------------------------------------------------------
   CICLO DE VIDA
--------------------------------------------------------- */

app.whenReady().then(createMainWindow);

app.on("window-all-closed", async () => {
    await kbService.stop().catch(() => {});
    app.quit();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
