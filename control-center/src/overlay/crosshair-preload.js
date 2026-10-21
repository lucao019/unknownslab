const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("crosshairAPI", {
    onUpdate: (cb) => {
        // Remove listener anterior antes de registrar novo — evita acúmulo de listeners.
        ipcRenderer.removeAllListeners("crosshair:update");
        ipcRenderer.on("crosshair:update", (_e, config) => cb(config));
    },
});
