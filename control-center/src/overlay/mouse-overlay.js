/* =========================================================
   MOUSE OVERLAY — renderer
   Recebe eventos do main via contextBridge e atualiza
   o visual do mouse.
========================================================= */

const RELEASE_MS   = 500;   // fade out de botões
const SCROLL_MS    = 300;   // duração da seta de scroll

const mouse  = document.getElementById("mouse");
const wheel  = document.getElementById("wheel");
const label  = document.getElementById("mouse-label");

const timers = {};

/* Mapa de label → classe CSS no elemento #mouse */
const CLASS_MAP = {
    "LMB":         { down: "active-lmb",         up: "releasing-lmb" },
    "RMB":         { down: "active-rmb",         up: "releasing-rmb" },
    "MMB":         { down: null,                 up: null },   // trata no wheel
    "M4":          { down: "active-m4",          up: "releasing-m4" },
    "M5":          { down: "active-m5",          up: "releasing-m5" },
    "SCROLL_UP":   { down: "active-scroll-up show-scroll-up",   up: null },
    "SCROLL_DOWN": { down: "active-scroll-down show-scroll-down", up: null },
};

const LABEL_TEXT = {
    "LMB": "LMB", "RMB": "RMB", "MMB": "CLICK",
    "M4": "M4", "M5": "M5",
    "SCROLL_UP": "↑", "SCROLL_DOWN": "↓"
};

function cancelTimer(key) {
    if (timers[key]) { clearTimeout(timers[key]); delete timers[key]; }
}

function applyClasses(classStr, add) {
    if (!classStr) return;
    classStr.split(" ").forEach(c => {
        if (c) mouse.classList[add ? "add" : "remove"](c);
    });
}

function onDown(lbl) {
    cancelTimer(lbl);

    if (lbl === "MMB") {
        wheel.classList.add("active");
    }

    const map = CLASS_MAP[lbl];
    if (map?.down) applyClasses(map.down, true);
    if (map?.up)   applyClasses(map.up, false);

    showLabel(LABEL_TEXT[lbl] ?? lbl);

    /* Scroll é auto-release */
    if (lbl === "SCROLL_UP" || lbl === "SCROLL_DOWN") {
        timers[lbl] = setTimeout(() => onUp(lbl), SCROLL_MS);
    }
}

function onUp(lbl) {
    const map = CLASS_MAP[lbl];

    if (lbl === "MMB") {
        wheel.classList.remove("active");
        clearLabel();
        return;
    }

    if (map?.down) applyClasses(map.down, false);
    if (map?.up)   applyClasses(map.up, true);

    clearLabel();

    cancelTimer(lbl);
    timers[lbl] = setTimeout(() => {
        if (map?.up) applyClasses(map.up, false);
        delete timers[lbl];
    }, RELEASE_MS);
}

function showLabel(text) {
    label.textContent = text;
    label.style.color = "rgba(245,197,24,0.85)";
}

function clearLabel() {
    label.textContent = "";
    label.style.color = "rgba(255,255,255,0.2)";
}

function clearAll() {
    Object.values(CLASS_MAP).forEach(m => {
        if (m.down) applyClasses(m.down, false);
        if (m.up)   applyClasses(m.up, false);
    });
    wheel.classList.remove("active");
    clearLabel();
    Object.keys(timers).forEach(k => { clearTimeout(timers[k]); delete timers[k]; });
}

/* Recebe do main */
window.overlayAPI?.onMouseEvent((event) => {
    if      (event.type === "mousedown") onDown(event.label);
    else if (event.type === "mouseup")   onUp(event.label);
    else if (event.type === "wheel")     onDown(event.label);
    else if (event.type === "clear")     clearAll();
});
