window.drawCrosshair = function (ctx, canvas, config) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    function drawDot(color, radius) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function drawCrossLines(color, lineWidth, size, gap, cap = "round") {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = cap;

        ctx.beginPath(); ctx.moveTo(cx, cy - gap); ctx.lineTo(cx, cy - gap - size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + gap + size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - gap, cy); ctx.lineTo(cx - gap - size, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + gap + size, cy); ctx.stroke();
    }

    function drawCircle(color, lineWidth, radius) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }

    function drawCS(color, outline, configuredSize) {
        const scale = configuredSize / 10;
        const size = 14 * scale, gap = 0, thick = 1.5 * scale, dotRadius = 1.5 * scale;
        if (outline) {
            drawCrossLines(outline, thick + 2, size, gap, "butt");
            drawDot(outline, dotRadius + 1.5);
        }
        drawCrossLines(color, thick, size, gap, "butt");
        drawDot(color, dotRadius);
    }

    function drawPUBG(color, outline) {
        const size = 8, gap = 5, thick = 2.5;
        if (outline) drawCrossLines(outline, thick + 2.5, size, gap, "butt");
        drawCrossLines(color, thick, size, gap, "butt");
    }

    function drawH1Z1(color, outline) {
        const radius = 10, thick = 1.5, dotRadius = 2;
        if (outline) {
            drawCircle(outline, thick + 2, radius);
            drawDot(outline, dotRadius + 1.5);
        }
        drawCircle(color, thick, radius);
        drawDot(color, dotRadius);
    }

    function drawFortnite(color, outline) {
        const size = 6, gap = 2, thick = 2, dotRadius = 2;
        if (outline) {
            drawCrossLines(outline, thick + 2.5, size, gap, "round");
            drawDot(outline, dotRadius + 1.5);
        }
        drawCrossLines(color, thick, size, gap, "round");
        drawDot(color, dotRadius);
    }

    const { style, color, outlineColor, thickness, size, gap, opacity } = config;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = opacity;

    const outline = outlineColor && outlineColor !== "" ? outlineColor : null;
    const outlineWidth = thickness * 2.5;
    const dotRadius = thickness * 2;

    switch (style) {
        case "cs":
            drawCS(color, outline, size);
            break;
        case "pubg":
            drawPUBG(color, outline);
            break;
        case "h1z1":
            drawH1Z1(color, outline);
            break;
        case "fortnite":
            drawFortnite(color, outline);
            break;
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
};
