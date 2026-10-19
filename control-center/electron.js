/* =========================================================
   UNKNOWNS LAB — Control Center
   Processo Main do Electron
========================================================= */

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");

const isDev = process.argv.includes("--dev");

let mainWindow   = null;
let kbOverlay    = null;   // janela overlay do Keyboard Visualizer
let mouseOverlay = null;   // janela overlay do Mouse Visualizer

/* ── Serviços ───────────────────────────────────────────── */
const kbService    = require("./src/services/keyboard-visualizer.js");
const mouseService = require("./src/services/mouse-visualizer.js");


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
   JANELA OVERLAY — MOUSE VISUALIZER
--------------------------------------------------------- */

function createMouseOverlay() {

    mouseOverlay = new BrowserWindow({
        width: 120,
        height: 160,

        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,

        x: 20,
        y: 580,

        title: "Unknowns Lab — Mouse",

        webPreferences: {
            preload: path.join(__dirname, "src", "overlay", "mouse-preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: isDev
        }
    });

    mouseOverlay.loadFile(
        path.join(__dirname, "src", "overlay", "mouse.html")
    );

    mouseOverlay.on("closed", () => { mouseOverlay = null; });

    mouseService.setMouseEventCallback((event) => {
        if (mouseOverlay && !mouseOverlay.isDestroyed()) {
            mouseOverlay.webContents.send("mouse-event", event);
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
   IPC — OVERLAY CONTROLS (move / close)
   Cada janela overlay envia esses eventos para si mesma.
   BrowserWindow.fromWebContents identifica qual janela enviou.
--------------------------------------------------------- */

ipcMain.on("overlay:move", (e, dx, dy) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win || win.isDestroyed()) return;
    const [x, y] = win.getPosition();
    win.setPosition(x + Math.round(dx), y + Math.round(dy));
});

ipcMain.on("overlay:close", (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win || win.isDestroyed()) return;
    win.close();
});


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
        } else if (id === "mouse-visualizer") {
            createMouseOverlay();
            await mouseService.start();
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
            if (kbOverlay && !kbOverlay.isDestroyed()) kbOverlay.close();
        } else if (id === "mouse-visualizer") {
            await mouseService.stop();
            if (mouseOverlay && !mouseOverlay.isDestroyed()) mouseOverlay.close();
        }
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

ipcMain.handle("module:status", (_e, id) => {
    if (id === "keyboard-visualizer") return kbService.getStatus();
    if (id === "mouse-visualizer")    return mouseService.getStatus();
    return null;
});


/* ---------------------------------------------------------
   CICLO DE VIDA
--------------------------------------------------------- */

app.whenReady().then(createMainWindow);

app.on("window-all-closed", async () => {
    await kbService.stop().catch(() => {});
    await mouseService.stop().catch(() => {});
    app.quit();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
