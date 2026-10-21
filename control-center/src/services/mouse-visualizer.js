/* =========================================================
   SERVICE — mouse-visualizer
   Captura global de mouse via uiohook-napi.
   Roda no processo MAIN do Electron.
   Envia eventos para a janela overlay via webContents.
========================================================= */

const inputHook = require("./global-input-hook.js");

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

        const onMouseDown = (e) => {
            const label = BUTTON_MAP[e.button];
            if (!label) return;
            this._emit("mousedown", label);
        };

        const onMouseUp = (e) => {
            const label = BUTTON_MAP[e.button];
            if (!label) return;
            this._emit("mouseup", label);
        };

        const onWheel = (e) => {
            /* rotation > 0 = scroll down, < 0 = scroll up no uiohook */
            const label = e.rotation > 0 ? "SCROLL_DOWN" : "SCROLL_UP";
            this._emit("wheel", label);
        };

        inputHook.start("mouse-visualizer", {
            mousedown: onMouseDown,
            mouseup: onMouseUp,
            wheel: onWheel
        });
        isRunning = true;
    },

    async stop() {
        if (!isRunning) return;

        inputHook.stop("mouse-visualizer");
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
