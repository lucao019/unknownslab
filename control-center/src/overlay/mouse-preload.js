/* =========================================================
   PRELOAD — Janela overlay do Mouse Visualizer
========================================================= */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlayAPI", {
    onMouseEvent: (callback) => {
        ipcRenderer.on("mouse-event", (_e, data) => callback(data));
    }
});
