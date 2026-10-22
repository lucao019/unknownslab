/**
 * @typedef {Object} KeyboardOverlayAPI
 * @property {(cb: (event: {type: string, label: string, keycode: number, ts: number}) => void) => void} onKeyEvent
 * @property {(dx: number, dy: number) => void} moveWindow
 * @property {(width: number, height: number, edge: string) => void} resizeWindow
 * @property {() => void} closeOverlay
 */

/** @type {KeyboardOverlayAPI} */
const api = {
    onKeyEvent:   (cb) => ipcRenderer.on("key-event", (_e, d) => cb(d)),
    moveWindow:   (dx, dy) => ipcRenderer.send("overlay:move", dx, dy),
    resizeWindow: (width, height, edge) => ipcRenderer.send("overlay:resize", width, height, edge),
    closeOverlay: () => ipcRenderer.send("overlay:close"),
};

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlayAPI", api);
