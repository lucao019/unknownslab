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

    /* Módulos — ciclo de vida real via IPC */
    moduleStart:  (id) => ipcRenderer.invoke("module:start", id),
    moduleStop:   (id) => ipcRenderer.invoke("module:stop", id),
    moduleStatus: (id) => ipcRenderer.invoke("module:status", id),

    /* Dados do PUBG Stats (jogadores online, kills, etc.) */
    pubgStatsData: () => ipcRenderer.invoke("pubg-stats:data"),

    /* Notificação quando overlay fecha pelo X */
    onModuleClosed: (cb) => ipcRenderer.on("module:closed", (_e, id) => cb(id)),

});
