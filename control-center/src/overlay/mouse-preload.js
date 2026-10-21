const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlayAPI", {
    onMouseEvent: (cb) => ipcRenderer.on("mouse-event", (_e, d) => cb(d)),
    moveWindow:   (dx, dy) => ipcRenderer.send("overlay:move", dx, dy),
    resizeWindow: (width, height, edge) => ipcRenderer.send("overlay:resize", width, height, edge),
    closeOverlay: () => ipcRenderer.send("overlay:close"),
});
