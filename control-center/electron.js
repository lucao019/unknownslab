/* =========================================================
   UNKNOWNS LAB — Control Center
   Processo Main do Electron
========================================================= */

const { app, BrowserWindow, ipcMain, shell, screen } = require("electron");
const path = require("path");

const isDev = process.argv.includes("--dev");

let mainWindow   = null;
let kbOverlay    = null;
let mouseOverlay = null;

/* ── Serviços ───────────────────────────────────────────── */
const kbService    = require("./src/services/keyboard-visualizer.js");
const mouseService = require("./src/services/mouse-visualizer.js");


/* ---------------------------------------------------------
   HELPERS — posição segura para overlays
   Usa workArea para descontar a taskbar.
--------------------------------------------------------- */

function safeOverlayPosition(winWidth, winHeight, offsetX = 20, offsetY = 20) {
    const display = screen.getPrimaryDisplay();
    const { x, y, width, height } = display.workArea;
    return {
        x: x + offsetX,
        y: y + height - winHeight - offsetY
    };
}

/* Nível de sobreposição — garante ficar sobre jogos em modo janela */
const OVERLAY_LEVEL = "screen-saver";


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

    mainWindow.loadFile(path.join(__dirname, "src", "index.html"));

    if (isDev) {
        mainWindow.webContents.openDevTools({ mode: "detach" });
    }

    mainWindow.on("closed", () => { mainWindow = null; });
}


/* ---------------------------------------------------------
   JANELA OVERLAY — KEYBOARD VISUALIZER
--------------------------------------------------------- */

function createKbOverlay() {

    const KB_W = 400, KB_H = 260;
    const pos  = safeOverlayPosition(KB_W, KB_H, 20, 20);

    kbOverlay = new BrowserWindow({
        width:  KB_W,
        height: KB_H,

        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,

        x: pos.x,
        y: pos.y,

        title: "Unknowns Lab — Keyboard",

        webPreferences: {
            preload: path.join(__dirname, "src", "overlay", "keyboard-preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: isDev
        }
    });

    /* Nível alto de sobreposição — fica sobre o jogo em modo janela */
    kbOverlay.setAlwaysOnTop(true, OVERLAY_LEVEL);

    kbOverlay.loadFile(path.join(__dirname, "src", "overlay", "keyboard.html"));

    kbOverlay.on("closed", () => { kbOverlay = null; });

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

    const MS_W = 120, MS_H = 180;
    const pos  = safeOverlayPosition(MS_W, MS_H, 440, 20);

    mouseOverlay = new BrowserWindow({
        width:  MS_W,
        height: MS_H,

        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,

        x: pos.x,
        y: pos.y,

        title: "Unknowns Lab — Mouse",

        webPreferences: {
            preload: path.join(__dirname, "src", "overlay", "mouse-preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: isDev
        }
    });

    mouseOverlay.setAlwaysOnTop(true, OVERLAY_LEVEL);

    mouseOverlay.loadFile(path.join(__dirname, "src", "overlay", "mouse.html"));

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

ipcMain.on("window:close",        () => mainWindow?.close());
ipcMain.on("shell:open-external", (_e, url) => shell.openExternal(url));


/* ---------------------------------------------------------
   IPC — OVERLAY CONTROLS (move / close)
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
