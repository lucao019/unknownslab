/* =========================================================
   SERVICE — keyboard-visualizer
   Captura global de teclado via uiohook-napi.
   Roda no processo MAIN do Electron.
   Envia eventos para a janela overlay via webContents.
========================================================= */

const { uIOhook, UiohookKey } = require("uiohook-napi");
const path = require("path");

/* Teclas relevantes para PUBG — exibidas na overlay */
const GAME_KEYS = {
    [UiohookKey.W]:      "W",
    [UiohookKey.A]:      "A",
    [UiohookKey.S]:      "S",
    [UiohookKey.D]:      "D",
    [UiohookKey.Space]:  "SPACE",
    [UiohookKey.Shift]:  "SHIFT",
    [UiohookKey.ShiftRight]: "SHIFT",
    [UiohookKey.Ctrl]:   "CTRL",
    [UiohookKey.CtrlRight]: "CTRL",
    [UiohookKey.C]:      "C",
    [UiohookKey.Z]:      "Z",
    [UiohookKey.V]:      "V",
    [UiohookKey.F]:      "F",
    [UiohookKey.Q]:      "Q",
    [UiohookKey.E]:      "E",
    [UiohookKey.R]:      "R",
    [UiohookKey.T]:      "T",
    [UiohookKey.G]:      "G",
    [UiohookKey.B]:      "B",
    [UiohookKey.M]:      "M",
    [UiohookKey.Tab]:    "TAB",
    [UiohookKey.Escape]: "ESC",
};

let overlayWindow = null;
let isRunning = false;
let onKeyEvent = null; // callback para o electron.js enviar via webContents

const service = {

    setOverlayWindow(win) {
        overlayWindow = win;
    },

    setKeyEventCallback(cb) {
        onKeyEvent = cb;
    },

    async start() {
        if (isRunning) return;

        uIOhook.on("keydown", (e) => {
            const label = GAME_KEYS[e.keycode];
            if (!label) return;
            this._emit("keydown", label, e.keycode);
        });

        uIOhook.on("keyup", (e) => {
            const label = GAME_KEYS[e.keycode];
            if (!label) return;
            this._emit("keyup", label, e.keycode);
        });

        uIOhook.start();
        isRunning = true;
    },

    async stop() {
        if (!isRunning) return;

        uIOhook.stop();
        uIOhook.removeAllListeners("keydown");
        uIOhook.removeAllListeners("keyup");
        isRunning = false;

        /* Avisa overlay para limpar estado */
        this._emit("clear", null, null);
    },

    getStatus() {
        return { running: isRunning };
    },

    _emit(type, label, keycode) {
        const event = { type, label, keycode, ts: Date.now() };
        if (onKeyEvent) onKeyEvent(event);
    }

};

module.exports = service;
