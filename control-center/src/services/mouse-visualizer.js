/* =========================================================
   SERVICE — mouse-visualizer
   Captura global de mouse via uiohook-napi.
   Roda no processo MAIN do Electron.
   Envia eventos para a janela overlay via webContents.
========================================================= */

const { uIOhook } = require("uiohook-napi");

/* Botões do uiohook */
const BUTTON_MAP = {
    1: "LMB",
    2: "RMB",
    3: "MMB",
    4: "M4",
    5: "M5"
};

let isRunning = false;
let onMouseEvent = null;

const service = {

    setMouseEventCallback(cb) {
        onMouseEvent = cb;
    },

    async start() {
        if (isRunning) return;

        uIOhook.on("mousedown", (e) => {
            const label = BUTTON_MAP[e.button];
            if (!label) return;
            this._emit("mousedown", label);
        });

        uIOhook.on("mouseup", (e) => {
            const label = BUTTON_MAP[e.button];
            if (!label) return;
            this._emit("mouseup", label);
        });

        uIOhook.on("wheel", (e) => {
            /* rotation > 0 = scroll down, < 0 = scroll up no uiohook */
            const label = e.rotation > 0 ? "SCROLL_DOWN" : "SCROLL_UP";
            this._emit("wheel", label);
        });

        /* uiohook pode já estar rodando pelo keyboard-visualizer —
           só chama start() se não estiver */
        try {
            uIOhook.start();
        } catch (_) {
            /* já estava rodando — ok */
        }

        isRunning = true;
    },

    async stop() {
        if (!isRunning) return;

        uIOhook.removeAllListeners("mousedown");
        uIOhook.removeAllListeners("mouseup");
        uIOhook.removeAllListeners("wheel");

        /* Só para o uiohook se o keyboard também não estiver rodando */
        const kbService = require("./keyboard-visualizer.js");
        if (!kbService.getStatus().running) {
            uIOhook.stop();
        }

        isRunning = false;
        this._emit("clear", null);
    },

    getStatus() {
        return { running: isRunning };
    },

    _emit(type, label) {
        if (onMouseEvent) onMouseEvent({ type, label, ts: Date.now() });
    }

};

module.exports = service;
