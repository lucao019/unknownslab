/* =========================================================
   UNKNOWNS LAB — Control Center
   Processo Main do Electron
========================================================= */

const { app, BrowserWindow, ipcMain, shell, screen, dialog } = require("electron");
const fs = require("fs");
const path = require("path");

const isDev = process.argv.includes("--dev");
const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) app.quit();

let mainWindow      = null;
let kbOverlay       = null;
let mouseOverlay    = null;
let crosshairWindow = null;
let crosshairReady  = false;
const overlayBaseSizes = {
    "keyboard-visualizer": { width: 420, height: 300 },
    "mouse-visualizer": { width: 140, height: 220 }
};
const overlayScales = {
    "keyboard-visualizer": 1,
    "mouse-visualizer": 1
};

const OVERLAY_SCALE_SAVE_DELAY_MS = 250;
let overlayScaleSaveTimer = null;

function loadOverlayScales() {
    const configPath = path.join(app.getPath("userData"), "overlay-scales.json");
    try {
        const saved = JSON.parse(fs.readFileSync(configPath, "utf8"));
        if (saved && typeof saved === "object") {
            const scales = { ...overlayScales };
            for (const key of Object.keys(overlayScales)) {
                if (Number.isFinite(saved[key])) {
                    scales[key] = clamp(saved[key], 0.5, 2.5);
                }
            }
            return scales;
        }
    } catch {
        // Ignora erro (arquivo não existe, JSON inválido, etc.)
    }
    return { ...overlayScales };
}

function writeOverlayScales(scales) {
    const configPath = path.join(app.getPath("userData"), "overlay-scales.json");
    try {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(scales, null, 2), "utf8");
    } catch (error) {
        console.error("Falha ao salvar escalas dos overlays:", error.message);
    }
}

function saveOverlayScales(scales) {
    clearTimeout(overlayScaleSaveTimer);
    overlayScaleSaveTimer = setTimeout(() => {
        overlayScaleSaveTimer = null;
        writeOverlayScales(scales);
    }, OVERLAY_SCALE_SAVE_DELAY_MS);
}

function flushOverlayScales() {
    if (overlayScaleSaveTimer === null) return;
    clearTimeout(overlayScaleSaveTimer);
    overlayScaleSaveTimer = null;
    writeOverlayScales(overlayScales);
}
const DEFAULT_CROSSHAIR_CONFIG = {
    style: "cross",
    color: "#00FF00",
    outlineColor: "#000000",
    size: 10,
    thickness: 2,
    gap: 4,
    opacity: 0.9
};
let currentCrosshairConfig = { ...DEFAULT_CROSSHAIR_CONFIG };

const VALID_MODULE_IDS = new Set(["keyboard-visualizer", "mouse-visualizer", "crosshair"]);

/* ── Serviços ───────────────────────────────────────────── */
const kbService         = require("./src/services/keyboard-visualizer.js");
const mouseService      = require("./src/services/mouse-visualizer.js");
const pubgStatsService  = require("./src/services/pubg-stats.js");
const monitorPubgForeground = require("./src/services/pubg-foreground-monitor.js");
const { collectHardwareDiagnostics } = require("./src/services/hardware-diagnostics.js");
const {
    startLiveHardwareMonitor,
    stopLiveHardwareMonitor
} = require("./src/services/live-hardware-monitor.js");
let stopPubgForegroundMonitor = null;

function decodeXmlFile(buffer) {
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
        if ((buffer.length - 2) % 2 !== 0) throw new Error("O arquivo XML UTF-16LE contém um número inválido de bytes.");
        return buffer.toString("utf16le", 2).replace(/^\uFEFF/, "");
    }
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
        if ((buffer.length - 2) % 2 !== 0) throw new Error("O arquivo XML UTF-16BE contém um número inválido de bytes.");
        return Buffer.from(buffer.subarray(2)).swap16().toString("utf16le").replace(/^\uFEFF/, "");
    }
    if (buffer.length >= 2 && buffer[0] === 0x3c && buffer[1] === 0x00) {
        if (buffer.length % 2 !== 0) throw new Error("O arquivo XML UTF-16LE contém um número inválido de bytes.");
        return buffer.toString("utf16le").replace(/^\uFEFF/, "");
    }
    if (buffer.length >= 2 && buffer[0] === 0x00 && buffer[1] === 0x3c) {
        if (buffer.length % 2 !== 0) throw new Error("O arquivo XML UTF-16BE contém um número inválido de bytes.");
        if (buffer.length % 2 !== 0) throw new Error("O arquivo XML UTF-16BE contém um número inválido de bytes.");
        return Buffer.from(buffer).swap16().toString("utf16le").replace(/^\uFEFF/, "");
    }
    return buffer.toString("utf8").replace(/^\uFEFF/, "");
}


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

/* Clamp helper — limita valores a um intervalo */
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

function getOverlaySize(id) {
    const base = overlayBaseSizes[id];
    const scale = overlayScales[id] ?? 1;
    return {
        width: Math.round(base.width * scale),
        height: Math.round(base.height * scale)
    };
}

function setOverlayScale(win, id, requestedScale, edge = "") {
    const base = overlayBaseSizes[id];
    if (!base || !win || win.isDestroyed() || !Number.isFinite(requestedScale)) return;

    const display = screen.getDisplayMatching(win.getBounds());
    const maxScale = Math.min(
        2.5,
        display.workArea.width / base.width,
        display.workArea.height / base.height
    );
    const scale = clamp(requestedScale, 0.5, Math.max(0.5, maxScale));
    overlayScales[id] = scale;
    saveOverlayScales(overlayScales);
    const bounds = win.getBounds();
    const width = Math.round(base.width * scale);
    const height = Math.round(base.height * scale);
    const anchorX = edge.includes("left") ? bounds.x + bounds.width :
        edge.includes("right") ? bounds.x : bounds.x + bounds.width / 2;
    const anchorY = edge.includes("top") ? bounds.y + bounds.height :
        edge.includes("bottom") ? bounds.y : bounds.y + bounds.height / 2;
    win.setBounds({
        x: Math.round(edge.includes("left") ? anchorX - width :
            edge.includes("right") ? anchorX : anchorX - width / 2),
        y: Math.round(edge.includes("top") ? anchorY - height :
            edge.includes("bottom") ? anchorY : anchorY - height / 2),
        width,
        height
    });
}


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

    mainWindow.on("closed", () => {
        stopLiveHardwareMonitor();
        mainWindow = null;
        for (const overlay of [kbOverlay, mouseOverlay, crosshairWindow]) {
            if (overlay && !overlay.isDestroyed()) overlay.close();
        }
    });
}


/* ---------------------------------------------------------
   JANELA OVERLAY — KEYBOARD VISUALIZER
--------------------------------------------------------- */

function createKbOverlay() {

    const { width: KB_W, height: KB_H } = getOverlaySize("keyboard-visualizer");
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

    kbOverlay.on("closed", () => {
        kbOverlay = null;
        kbService.stop().catch(() => {});
        /* Avisa o renderer para atualizar o toggle para OFF */
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("module:closed", "keyboard-visualizer");
        }
    });

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

    const { width: MS_W, height: MS_H } = getOverlaySize("mouse-visualizer");
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

    mouseOverlay.on("closed", () => {
        mouseOverlay = null;
        mouseService.stop().catch(() => {});
        /* Avisa o renderer para atualizar o toggle para OFF */
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("module:closed", "mouse-visualizer");
        }
    });

    mouseService.setMouseEventCallback((event) => {
        if (mouseOverlay && !mouseOverlay.isDestroyed()) {
            mouseOverlay.webContents.send("mouse-event", event);
        }
    });
}


/* ---------------------------------------------------------
   CROSSHAIR — hook de RMB (esconde ao mirar)
   uiohook já está disponível no processo main.
   Registra listeners independentes da crosshair para
   não interferir com o mouse-visualizer.
--------------------------------------------------------- */
const inputHook = require("./src/services/global-input-hook.js");
const { UiohookKey } = require("uiohook-napi");

let rmbHookActive = false;
let pubgForegroundActive = false;
let pubgForegroundBounds = null;
let crosshairSuppressedByOutsideClick = false;
const pressedCrosshairKeys = new Set();
const CROSSHAIR_STYLES = ["dot", "cross", "circle"];
const CROSSHAIR_COLORS = ["#00FF00", "#FF0000", "#00A2FF", "#FFFF00", "#FFFFFF", "#FF00FF"];

function startRmbHook() {
    if (rmbHookActive) return;

    inputHook.start("crosshair", {
        mousedown: _onRmbDown,
        mouseup: _onRmbUp,
        keydown: _onCrosshairKeyDown,
        keyup: _onCrosshairKeyUp,
        wheel: _onCrosshairWheel
    });
    rmbHookActive = true;
}

function stopRmbHook() {
    if (!rmbHookActive) return;
    inputHook.stop("crosshair");
    pressedCrosshairKeys.clear();
    rmbHookActive = false;
}

function isCrosshairInputContextActive() {
    const overlayVisible = crosshairWindow && !crosshairWindow.isDestroyed() && crosshairWindow.isVisible();
    const controlCenterFocused = mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused();
    return overlayVisible || controlCenterFocused;
}

function _onCrosshairKeyDown(e) {
    if (!isCrosshairInputContextActive()) return;
    if (pressedCrosshairKeys.has(e.keycode)) return;
    pressedCrosshairKeys.add(e.keycode);

    if (e.keycode === UiohookKey.Backquote || e.keycode === UiohookKey.BracketLeft) {
        const currentIndex = CROSSHAIR_STYLES.indexOf(currentCrosshairConfig.style);
        const direction = e.keycode === UiohookKey.BracketLeft ? 1 : -1;
        const nextIndex = (currentIndex + direction + CROSSHAIR_STYLES.length) % CROSSHAIR_STYLES.length;
        updateCrosshairConfig({ ...currentCrosshairConfig, style: CROSSHAIR_STYLES[nextIndex] }, "bind");
    } else if (e.keycode === UiohookKey.Quote || e.keycode === UiohookKey.BracketRight) {
        const currentIndex = CROSSHAIR_COLORS.indexOf(currentCrosshairConfig.color.toUpperCase());
        const direction = e.keycode === UiohookKey.BracketRight ? 1 : -1;
        const nextIndex = (currentIndex + direction + CROSSHAIR_COLORS.length) % CROSSHAIR_COLORS.length;
        updateCrosshairConfig({ ...currentCrosshairConfig, color: CROSSHAIR_COLORS[nextIndex] }, "bind");
    }
}

function _onCrosshairKeyUp(e) {
    pressedCrosshairKeys.delete(e.keycode);
}

function _onCrosshairWheel(e) {
    if (!e.ctrlKey || !isCrosshairInputContextActive()) return;
    const direction = e.rotation < 0 ? 1 : -1;
    const size = clamp(currentCrosshairConfig.size + direction, 2, 40);
    if (size !== currentCrosshairConfig.size) {
        updateCrosshairConfig({ ...currentCrosshairConfig, size }, "bind");
    }
}

function _onRmbDown(e) {
    if (pubgForegroundActive && pubgForegroundBounds &&
        (e.x < pubgForegroundBounds.x || e.y < pubgForegroundBounds.y ||
         e.x >= pubgForegroundBounds.x + pubgForegroundBounds.width ||
         e.y >= pubgForegroundBounds.y + pubgForegroundBounds.height)) {
        crosshairSuppressedByOutsideClick = true;
        if (crosshairWindow && !crosshairWindow.isDestroyed()) crosshairWindow.hide();
        return;
    }
    if (pubgForegroundActive && crosshairSuppressedByOutsideClick) {
        crosshairSuppressedByOutsideClick = false;
        if (e.button !== 2 && crosshairWindow && !crosshairWindow.isDestroyed()) {
            crosshairWindow.showInactive();
        }
    }
    if (e.button !== 2) return;
    if (crosshairWindow && !crosshairWindow.isDestroyed()) {
        crosshairWindow.hide();
    }
}

function _onRmbUp(e) {
    if (e.button !== 2) return;
    if (pubgForegroundActive && !crosshairSuppressedByOutsideClick &&
        crosshairWindow && !crosshairWindow.isDestroyed()) {
        crosshairWindow.showInactive();
    }
}

/* ---------------------------------------------------------
   JANELA OVERLAY — CROSSHAIR
--------------------------------------------------------- */

function createCrosshairOverlay() {
    if (crosshairWindow && !crosshairWindow.isDestroyed()) return;

    const CROSSHAIR_W = 200, CROSSHAIR_H = 200;
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.bounds;
    const xPos = Math.round((width - CROSSHAIR_W) / 2);
    const yPos = Math.round((height - CROSSHAIR_H) / 2);

    crosshairWindow = new BrowserWindow({
        width:  CROSSHAIR_W,
        height: CROSSHAIR_H,
        x: xPos,
        y: yPos,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        focusable: false,
        show: false,
        title: "Unknowns Lab — Crosshair",
        webPreferences: {
            preload: path.join(__dirname, "src", "overlay", "crosshair-preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: isDev
        }
    });

    crosshairReady = false;
    crosshairWindow.webContents.once("did-finish-load", () => {
        if (!crosshairWindow || crosshairWindow.isDestroyed()) return;
        crosshairReady = true;
        crosshairWindow.webContents.send("crosshair:update", currentCrosshairConfig);
        stopPubgForegroundMonitor = monitorPubgForeground(({ active, bounds }) => {
            const wasActive = pubgForegroundActive;
            pubgForegroundActive = active;
            pubgForegroundBounds = active ? bounds : null;
            if (!active) crosshairSuppressedByOutsideClick = false;
            else if (!wasActive) crosshairSuppressedByOutsideClick = false;
            if (!crosshairWindow || crosshairWindow.isDestroyed()) return;
            if (!active) {
                crosshairWindow.hide();
                return;
            }
            if (crosshairSuppressedByOutsideClick) return;

            const gameCenter = screen.screenToDipPoint({
                x: bounds.x + bounds.width / 2,
                y: bounds.y + bounds.height / 2
            });
            crosshairWindow.setPosition(
                Math.round(gameCenter.x - crosshairWindow.getBounds().width / 2),
                Math.round(gameCenter.y - crosshairWindow.getBounds().height / 2)
            );
            crosshairWindow.showInactive();
        });
    });

    crosshairWindow.setAlwaysOnTop(true, OVERLAY_LEVEL);
    crosshairWindow.setIgnoreMouseEvents(true, { forward: true });
    crosshairWindow.loadFile(path.join(__dirname, "src", "overlay", "crosshair.html"));

    /* Inicia o hook de RMB ao abrir a crosshair */
    startRmbHook();

    crosshairWindow.on("closed", () => {
        stopPubgForegroundMonitor?.();
        stopPubgForegroundMonitor = null;
        stopRmbHook();
        crosshairWindow = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("module:closed", "crosshair");
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
ipcMain.on("shell:open-external", (_e, url) => {
    if (typeof url === "string" && /^https?:\/\//i.test(url)) {
        shell.openExternal(url);
    }
});


/* ---------------------------------------------------------
   IPC — OVERLAY CONTROLS (move / close)
--------------------------------------------------------- */

ipcMain.on("overlay:move", (e, dx, dy) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win || win.isDestroyed()) return;
    const [x, y] = win.getPosition();
    win.setPosition(
        x + Math.round(clamp(dx, -500, 500)),
        y + Math.round(clamp(dy, -500, 500))
    );
});

ipcMain.on("overlay:resize", (e, width, height, edge) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win || win.isDestroyed()) return;
    if (!Number.isFinite(width) || !Number.isFinite(height)) return;

    const id = win === kbOverlay ? "keyboard-visualizer" :
        win === mouseOverlay ? "mouse-visualizer" : null;
    if (!id) return;
    const base = overlayBaseSizes[id];
    const validEdges = new Set([
        "top", "right", "bottom", "left",
        "top-left", "top-right", "bottom-right", "bottom-left"
    ]);
    if (typeof edge !== "string" || !validEdges.has(edge)) return;
    setOverlayScale(win, id, Math.min(width / base.width, height / base.height), edge);
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
    if (!VALID_MODULE_IDS.has(id)) return { ok: false, error: "Unknown module" };
    try {
        if (id === "keyboard-visualizer") {
            createKbOverlay();
            await kbService.start();
        } else if (id === "mouse-visualizer") {
            createMouseOverlay();
            await mouseService.start();
        } else if (id === "crosshair") {
            createCrosshairOverlay();
        }
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

ipcMain.handle("module:stop", async (_e, id) => {
    if (!VALID_MODULE_IDS.has(id)) return { ok: false, error: "Unknown module" };
    try {
        if (id === "keyboard-visualizer") {
            await kbService.stop();
            if (kbOverlay && !kbOverlay.isDestroyed()) kbOverlay.close();
        } else if (id === "mouse-visualizer") {
            await mouseService.stop();
            if (mouseOverlay && !mouseOverlay.isDestroyed()) mouseOverlay.close();
        } else if (id === "crosshair") {
            if (crosshairWindow && !crosshairWindow.isDestroyed()) crosshairWindow.close();
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

/* Retorna os últimos dados do PUBG Stats (kills, online, etc.) */
ipcMain.handle("pubg-stats:data", () => {
    return pubgStatsService.getStatus();
});

ipcMain.handle("hardware-diagnostics:collect", async (event) => {
    if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
        throw new Error("Solicitação de diagnóstico não autorizada.");
    }

    return collectHardwareDiagnostics(screen.getAllDisplays());
});

ipcMain.handle("hardware-monitor:start", async (event) => {
    if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
        throw new Error("Solicitação de monitoramento não autorizada.");
    }

    return startLiveHardwareMonitor(snapshot => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("hardware-monitor:update", snapshot);
        }
    });
});

ipcMain.handle("hardware-monitor:stop", (event) => {
    if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
        throw new Error("Solicitação para parar monitoramento não autorizada.");
    }
    return stopLiveHardwareMonitor();
});

ipcMain.handle("nip-profile:open", async (event) => {
    if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
        throw new Error("Solicitação de leitura de perfil não autorizada.");
    }

    const selection = await dialog.showOpenDialog(mainWindow, {
        title: "Selecionar perfil NVIDIA para análise",
        properties: ["openFile"],
        filters: [{ name: "Perfis NVIDIA", extensions: ["nip", "xml"] }]
    });
    if (selection.canceled || selection.filePaths.length === 0) {
        return { canceled: true };
    }

    const filePath = selection.filePaths[0];
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== ".nip" && extension !== ".xml") {
        throw new Error("Selecione um arquivo .nip ou XML exportado pelo NVIDIA Profile Inspector.");
    }

    const maximumSize = 2 * 1024 * 1024;
    const fileInfo = await fs.promises.stat(filePath);
    if (!fileInfo.isFile()) {
        throw new Error("O caminho selecionado não é um arquivo.");
    }
    if (fileInfo.size > maximumSize) {
        throw new Error("O arquivo excede o limite de 2 MB para análise.");
    }
    const file = await fs.promises.readFile(filePath);
    if (file.length > maximumSize) {
        throw new Error("O arquivo excede o limite de 2 MB para análise.");
    }

    return {
        canceled: false,
        name: path.basename(filePath),
        content: decodeXmlFile(file)
    };
});

ipcMain.handle("crosshair:get-config", () => currentCrosshairConfig);

/* Sanitiza e encaminha configuração de crosshair para a janela overlay.
   Valida campos na fronteira de confiança antes de repassar ao renderer. */
const VALID_CROSSHAIR_STYLES = new Set(["cross", "dot", "crossdot", "circle", "circledot", "cs", "pubg", "h1z1", "fortnite"]);

function sanitizeCrosshairConfig(raw) {
    if (!raw || typeof raw !== "object") return null;

    const style = VALID_CROSSHAIR_STYLES.has(raw.style) ? raw.style : "cross";

    // Aceita apenas strings hex válidas (#RGB ou #RRGGBB); rejeita qualquer outra coisa.
    const hexColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    const color        = hexColor.test(raw.color)        ? raw.color        : "#00FF00";
    const outlineColor = hexColor.test(raw.outlineColor) ? raw.outlineColor : null;

    const size      = clamp(Number(raw.size)      || 10,  1, 100);
    const thickness = clamp(Number(raw.thickness) || 2,   0.5, 20);
    const gap       = clamp(Number(raw.gap)        || 4,  0, 50);
    const opacity   = clamp(Number(raw.opacity)    || 0.9, 0, 1);
    return { style, color, outlineColor, size, thickness, gap, opacity };
}

function loadCrosshairConfig() {
    const configPath = path.join(app.getPath("userData"), "crosshair-config.json");
    try {
        const saved = JSON.parse(fs.readFileSync(configPath, "utf8"));
        return sanitizeCrosshairConfig(saved) || { ...DEFAULT_CROSSHAIR_CONFIG };
    } catch {
        return { ...DEFAULT_CROSSHAIR_CONFIG };
    }
}

function saveCrosshairConfig(config) {
    const configPath = path.join(app.getPath("userData"), "crosshair-config.json");
    try {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    } catch (error) {
        console.error("Falha ao salvar configuração da crosshair:", error.message);
    }
}

ipcMain.on("crosshair:config", (_e, rawConfig) => {
    const config = sanitizeCrosshairConfig(rawConfig);
    if (!config) return;
    updateCrosshairConfig(config, "panel");
});

function updateCrosshairConfig(config, source) {
    currentCrosshairConfig = config;
    saveCrosshairConfig(config);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("crosshair:config-updated", config, source);
    }
    if (!crosshairReady || !crosshairWindow || crosshairWindow.isDestroyed()) return;
    crosshairWindow.webContents.send("crosshair:update", config);
}


/* ---------------------------------------------------------
   CICLO DE VIDA
--------------------------------------------------------- */

app.whenReady().then(() => {
    if (!hasSingleInstanceLock) return;
    currentCrosshairConfig = loadCrosshairConfig();
    Object.assign(overlayScales, loadOverlayScales());
    createMainWindow();
});

app.on("second-instance", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
});

app.on("before-quit", flushOverlayScales);

app.on("window-all-closed", async () => {
    if (!hasSingleInstanceLock) return;
    await kbService.stop().catch(() => {});
    await mouseService.stop().catch(() => {});
    app.quit();
});

app.on("activate", () => {
    if (!hasSingleInstanceLock) return;
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
