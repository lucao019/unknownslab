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
const ctx    = canvas.getContext("2d");
const CX = 100, CY = 100; // center

/* ── Primitivos ───────────────────────────────────────── */

function drawDot(color, radius) {
    ctx.beginPath();
    ctx.arc(CX, CY, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawCrossLines(color, lineWidth, size, gap, cap = "round") {
    ctx.strokeStyle = color;
    ctx.lineWidth   = lineWidth;
    ctx.lineCap     = cap;

    ctx.beginPath(); ctx.moveTo(CX, CY - gap);       ctx.lineTo(CX, CY - gap - size);       ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX, CY + gap);       ctx.lineTo(CX, CY + gap + size);       ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX - gap, CY);       ctx.lineTo(CX - gap - size, CY);       ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX + gap, CY);       ctx.lineTo(CX + gap + size, CY);       ctx.stroke();
}

function drawCircle(color, lineWidth, radius) {
    ctx.beginPath();
    ctx.arc(CX, CY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth   = lineWidth;
    ctx.stroke();
}

/* ── Estilos de jogo ──────────────────────────────────── */

/*
   CS (Counter-Strike)
   Cruz fina, braços longos, sem gap central, outline fino,
   dot central pequeno. Estilo competitivo clássico.
*/
function drawCS(color, outline, configuredSize = 10) {
    const scale = configuredSize / 10;
    const size = 14 * scale, gap = 0, thick = 1.5 * scale, dotR = 1.5 * scale;
    if (outline) {
        drawCrossLines(outline, thick + 2, size, gap, "butt");
        drawDot(outline, dotR + 1.5);
    }
    drawCrossLines(color, thick, size, gap, "butt");
    drawDot(color, dotR);
}

/*
   PUBG
   Cruz com gap largo, braços curtos e grossos, sem dot,
   linhas quadradas (butt). Estilo militar/tático.
*/
function drawPUBG(color, outline) {
    const size = 8, gap = 5, thick = 2.5;
    if (outline) drawCrossLines(outline, thick + 2.5, size, gap, "butt");
    drawCrossLines(color, thick, size, gap, "butt");
}

/*
   H1Z1 (Just Survive / Z1BR)
   Círculo com dot central, sem cruz. Estilo battle royale original.
*/
function drawH1Z1(color, outline) {
    const radius = 10, thick = 1.5, dotR = 2;
    if (outline) {
        drawCircle(outline, thick + 2, radius);
        drawDot(outline, dotR + 1.5);
    }
    drawCircle(color, thick, radius);
    drawDot(color, dotR);
}

/*
   Fortnite
   Cruz com braços muito curtos e gap pequeno, linhas arredondadas,
   dot central, estilo moderno/arcade.
*/
function drawFortnite(color, outline) {
    const size = 6, gap = 2, thick = 2, dotR = 2;
    if (outline) {
        drawCrossLines(outline, thick + 2.5, size, gap, "round");
        drawDot(outline, dotR + 1.5);
    }
    drawCrossLines(color, thick, size, gap, "round");
    drawDot(color, dotR);
}

/* ── Render principal ─────────────────────────────────── */

let currentConfig = Object.assign({}, DEFAULT_CROSSHAIR);

function render(config) {
    currentConfig = config;
    const { style, color, outlineColor, thickness, size, gap, opacity } = config;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = opacity;

    const hasOutline   = outlineColor && outlineColor !== "";
    const outline      = hasOutline ? outlineColor : null;
    const outlineWidth = thickness * 2.5;
    const dotRadius    = thickness * 2;

    switch (style) {
        /* ── Estilos de jogo ── */
        case "cs":       drawCS(color, outline, size); break;
        case "pubg":     drawPUBG(color, outline);     break;
        case "h1z1":     drawH1Z1(color, outline);     break;
        case "fortnite": drawFortnite(color, outline); break;

        /* ── Estilos genéricos (mantidos) ── */
        case "cross":
        case "crossdot":
            if (outline) drawCrossLines(outline, outlineWidth, size, gap);
            drawCrossLines(color, thickness, size, gap);
            if (style === "crossdot") {
                if (outline) drawDot(outline, dotRadius + 1.5);
                drawDot(color, dotRadius);
            }
            break;

        case "circle":
        case "circledot":
            if (outline) drawCircle(outline, outlineWidth, size);
            drawCircle(color, thickness, size);
            if (style === "circledot") {
                if (outline) drawDot(outline, dotRadius + 1.5);
                drawDot(color, dotRadius);
            }
            break;

        case "dot":
            if (outline) drawDot(outline, size + 1.5);
            drawDot(color, size);
            break;

        default:
            drawCS(color, outline, size);
    }

    ctx.globalAlpha = 1;
}

// Render com defaults ao carregar
render(DEFAULT_CROSSHAIR);

// Recebe updates do processo main
if (window.crosshairAPI) {
    window.crosshairAPI.onUpdate((config) => render(config));
}
