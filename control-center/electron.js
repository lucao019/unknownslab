/* =========================================================
   PUBG INPUT LAB — Control Center
   Processo Main do Electron
========================================================= */

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");

const isDev = process.argv.includes("--dev");

let mainWindow = null;

/* ---------------------------------------------------------
   CRIAÇÃO DA JANELA PRINCIPAL
--------------------------------------------------------- */

function createWindow() {

    mainWindow = new BrowserWindow({
        width: 1100,
        height: 720,
        minWidth: 900,
        minHeight: 600,

        frame: false,
        transparent: false,
        backgroundColor: "#0d0d0f",

        title: "Unknowns Lab — Control Center",

        icon: path.join(__dirname, "src", "assets", "icon.png"),

        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: isDev
        }
    });

    mainWindow.loadFile(
        path.join(__dirname, "src", "index.html")
    );

    if (isDev) {
        mainWindow.webContents.openDevTools({
            mode: "detach"
        });
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

}


/* ---------------------------------------------------------
   CONTROLES DA JANELA (via IPC — titlebar customizada)
--------------------------------------------------------- */

ipcMain.on("window:minimize", () => {
    mainWindow?.minimize();
});

ipcMain.on("window:maximize", () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow?.maximize();
    }
});

ipcMain.on("window:close", () => {
    mainWindow?.close();
});

/* Abre links externos no navegador padrão, não no Electron */
ipcMain.on("shell:open-external", (_event, url) => {
    shell.openExternal(url);
});


/* ---------------------------------------------------------
   CICLO DE VIDA
--------------------------------------------------------- */

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    app.quit();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
