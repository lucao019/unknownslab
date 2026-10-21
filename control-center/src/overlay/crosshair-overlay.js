/* =========================================================
   CROSSHAIR OVERLAY — Renderer
   Renders a configurable crosshair on a 200x200 canvas.
   Styles: cross, dot, crossdot, circle, circledot,
           cs, pubg, h1z1, fortnite
========================================================= */

const DEFAULT_CROSSHAIR = {
    style:        "cross",
    color:        "#00FF00",
    outlineColor: "#000000",
    size:         10,
    thickness:    2,
    gap:          4,
    opacity:      0.9
};

const canvas = document.getElementById("ch");
const ctx = canvas.getContext("2d");

let currentConfig = Object.assign({}, DEFAULT_CROSSHAIR);

function render(config) {
    currentConfig = config;
    window.drawCrosshair(ctx, canvas, config);
}

// Render com defaults ao carregar
render(DEFAULT_CROSSHAIR);

// Recebe updates do processo main
if (window.crosshairAPI) {
    window.crosshairAPI.onUpdate((config) => render(config));
}
