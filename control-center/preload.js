/* =========================================================
   PRELOAD — Bridge segura entre renderer e main
   contextIsolation: true | nodeIntegration: false
========================================================= */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {

    /* Controles da janela */
    minimize: () => ipcRenderer.send("window:minimize"),
    maximize: () => ipcRenderer.send("window:maximize"),
    close:    () => ipcRenderer.send("window:close"),

    /* Abrir URL no navegador externo */
    openExternal: (url) => ipcRenderer.send("shell:open-external", url),

    /* Versão do app */
    getVersion: () => ipcRenderer.invoke("app:version")

});
