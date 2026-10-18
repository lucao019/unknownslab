/* =========================================================
   PRELOAD — Janela overlay do Keyboard Visualizer
   Bridge entre o processo main e o renderer da overlay.
========================================================= */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlayAPI", {

    onKeyEvent: (callback) => {
        ipcRenderer.on("key-event", (_event, data) => {
            callback(data);
        });
    }

});
