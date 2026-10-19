const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlayAPI", {
    onKeyEvent:         (cb) => ipcRenderer.on("key-event", (_e, d) => cb(d)),
    moveWindow:         (dx, dy) => ipcRenderer.send("overlay:move", dx, dy),
    closeOverlay:       () => ipcRenderer.send("overlay:close"),
    /* Controla se a janela ignora eventos de mouse nas áreas transparentes */
    setIgnoreMouse:     (ignore) => ipcRenderer.send("overlay:ignore-mouse", ignore),
});
