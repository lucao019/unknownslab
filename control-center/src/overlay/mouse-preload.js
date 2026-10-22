/**
 * @typedef {Object} MouseOverlayAPI
 * @property {(cb: (event: {type: string, button: number, x: number, y: number, ts: number}) => void) => void} onMouseEvent
 * @property {(dx: number, dy: number) => void} moveWindow
 * @property {(width: number, height: number, edge: string) => void} resizeWindow
 * @property {() => void} closeOverlay
 */

/** @type {MouseOverlayAPI} */
const api = {
    onMouseEvent: (cb) => ipcRenderer.on("mouse-event", (_e, d) => cb(d)),
    moveWindow:   (dx, dy) => ipcRenderer.send("overlay:move", dx, dy),
    resizeWindow: (width, height, edge) => ipcRenderer.send("overlay:resize", width, height, edge),
    closeOverlay: () => ipcRenderer.send("overlay:close"),
};

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlayAPI", api);
