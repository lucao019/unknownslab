const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlayAPI", {
    onMouseEvent: (cb) => ipcRenderer.on("mouse-event", (_e, d) => cb(d)),
    moveWindow:   (dx, dy) => ipcRenderer.send("overlay:move", dx, dy),
    closeOverlay: () => ipcRenderer.send("overlay:close"),
});
