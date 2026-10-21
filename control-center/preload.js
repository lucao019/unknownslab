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

    /* Diagnóstico local de hardware, somente leitura */
    collectHardwareDiagnostics: () => ipcRenderer.invoke("hardware-diagnostics:collect"),

    /* Telemetria local ao vivo, somente leitura */
    startHardwareMonitor: () => ipcRenderer.invoke("hardware-monitor:start"),
    stopHardwareMonitor: () => ipcRenderer.invoke("hardware-monitor:stop"),
    onHardwareMonitorUpdate: (cb) => {
        ipcRenderer.removeAllListeners("hardware-monitor:update");
        ipcRenderer.on("hardware-monitor:update", (_e, snapshot) => cb(snapshot));
    },

    /* Seleção de um perfil NVIDIA pela caixa de diálogo nativa */
    openNipProfile: () => ipcRenderer.invoke("nip-profile:open"),

    /* Notificação quando overlay fecha pelo X */
    onModuleClosed: (cb) => {
        ipcRenderer.on("module:closed", (_e, id) => cb(id));
    },

    /* Crosshair — envia config de estilo/cor ao overlay */
    crosshairConfig: (config) => ipcRenderer.send("crosshair:config", config),
    getCrosshairConfig: () => ipcRenderer.invoke("crosshair:get-config"),
    onCrosshairConfigUpdated: (cb) => {
        ipcRenderer.removeAllListeners("crosshair:config-updated");
        ipcRenderer.on("crosshair:config-updated", (_e, config, source) => cb(config, source));
    },

});
