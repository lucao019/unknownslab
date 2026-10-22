/* =========================================================
   ORGANIC MENU — navegação cyberpunk do Unknowns Lab
   Núcleos de energia independentes com seleção persistente
========================================================= */

/**
 * @typedef {Object} MenuItem
 * @property {string} id - Identificador único (data-page)
 * @property {string} label - Texto exibido
 * @property {string} icon - Nome do ícone (chave do ORGANIC_ICONS)
 * @property {boolean} available - Se a funcionalidade existe
 * @property {string} [description] - Descrição opcional
 */

/** @type {MenuItem[]} */
const MENU_ITEMS = [
    { id: "dashboard",    label: "Dashboard",    icon: "layout-dashboard", available: true,  description: "Estado geral dos módulos" },
    { id: "overlay",      label: "Overlay",      icon: "layers",           available: true,  description: "Elementos visuais para OBS" },
    { id: "enhancements", label: "Enhancements", icon: "cpu",              available: true,  description: "PUBG Performance Lab" },
    { id: "movement",     label: "Movement Lab", icon: "move",             available: false, description: "Exercícios de movimentação (planejado)" },
    { id: "analysis",     label: "Input Analysis", icon: "activity",       available: false, description: "Gravação e análise de sessões (planejado)" },
    { id: "streaming",    label: "Streaming",    icon: "radio",            available: false, description: "OBS Integration, Tutorial Mode (planejado)" },
    { id: "settings",     label: "Settings",     icon: "settings",         available: true,  description: "Configurações globais" },
];

const UI_SOUND_STORAGE_KEY = "unknowns-lab.ui-sounds";
const UI_SOUND_DURATION_SECONDS = 0.085;
let uiSoundsEnabled = loadUiSoundsEnabled();
let uiAudioContext = null;
let activeUiTone = null;
let uiToneRequestId = 0;

function loadUiSoundsEnabled() {
    try {
        return localStorage.getItem(UI_SOUND_STORAGE_KEY) !== "false";
    } catch (error) {
        console.warn("Não foi possível carregar a preferência de sons da interface:", error);
        return true;
    }
}

function playUiNavigationSound() {
    if (!uiSoundsEnabled) return;
    const requestId = ++uiToneRequestId;

    try {
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextConstructor) return;
        uiAudioContext ??= new AudioContextConstructor();

        if (activeUiTone) {
            try {
                activeUiTone.stop();
            } catch (error) {
                if (error.name !== "InvalidStateError") throw error;
            }
            activeUiTone = null;
        }

        const playTone = () => {
            if (requestId !== uiToneRequestId || !uiSoundsEnabled) return;
            const now = uiAudioContext.currentTime;
            const oscillator = uiAudioContext.createOscillator();
            const gain = uiAudioContext.createGain();
            oscillator.type = "triangle";
            oscillator.frequency.setValueAtTime(520, now);
            oscillator.frequency.exponentialRampToValueAtTime(760, now + UI_SOUND_DURATION_SECONDS);
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.035, now + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + UI_SOUND_DURATION_SECONDS);
            oscillator.connect(gain);
            gain.connect(uiAudioContext.destination);
            oscillator.onended = () => {
                if (activeUiTone === oscillator) activeUiTone = null;
                oscillator.disconnect();
                gain.disconnect();
            };
            activeUiTone = oscillator;
            oscillator.start(now);
            oscillator.stop(now + UI_SOUND_DURATION_SECONDS);
        };

        if (uiAudioContext.state === "suspended") {
            uiAudioContext.resume().then(playTone).catch((error) => {
                console.warn("Não foi possível iniciar o áudio da interface:", error);
            });
        } else {
            playTone();
        }
    } catch (error) {
        console.warn("Falha ao reproduzir o som de navegação:", error);
    }
}

/* Ícones SVG (Lucide) */
const ORGANIC_ICONS = {
    "layout-dashboard": `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`,
    "layers":           `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    "cpu":              `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>`,
    "move":             `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>`,
    "activity":         `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    "radio":            `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M7.76 7.76a6 6 0 0 0 0 8.49"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/></svg>`,
    "settings":         `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l-.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
};

/** Curva-guia usada apenas para posicionar os indicadores independentes. */
const ORGANIC_PATH = `
    M 43 30
    C 31 90, 57 140, 40 200
    C 25 260, 63 310, 49 370
    C 36 430, 29 490, 43 550
    C 57 610, 34 660, 45 710
`;

/** Gera posições dos nós ao longo do path com variação orgânica */
function getNodePositions(pathString, count) {
    const coords = [];
    const tokens = pathString.trim().match(/[MC]\s*[\d\-\.\s,]+/g) || [];
    let points = [];

    tokens.forEach(token => {
        const type = token.trim()[0];
        const nums = token.trim().slice(1).split(/[\s,]+/).filter(Boolean).map(Number);
        if (type === 'M') {
            points.push({ x: nums[0], y: nums[1] });
        } else if (type === 'C') {
            for (let i = 0; i < nums.length; i += 6) {
                points.push({ x: nums[i+4], y: nums[i+5] });
            }
        }
    });

    const totalPoints = points.length;
    for (let i = 0; i < count; i++) {
        const t = i / Math.max(1, count - 1);
        const idx = t * (totalPoints - 1);
        const i0 = Math.floor(idx);
        const i1 = Math.min(i0 + 1, totalPoints - 1);
        const localT = idx - i0;
        const p0 = points[i0];
        const p1 = points[i1];

        const seed = i * 12.345;
        const jitterX = Math.sin(t * Math.PI * 4) * 12 + Math.sin(t * Math.PI * 6) * 4;
        const jitterY = (Math.cos(seed * 0.9) * 0.4 + Math.sin(seed * 2.1) * 0.2) * 2;

        coords.push({
            x: p0.x + (p1.x - p0.x) * localT + jitterX,
            y: p0.y + (p1.y - p0.y) * localT + jitterY
        });
    }
    return coords;
}

/** Cria path suave (Catmull-Rom style) entre posições dadas */
function createOrganicPath(positions) {
    if (positions.length === 0) return "";
    if (positions.length === 1) return `M ${positions[0].x} ${positions[0].y}`;

    let path = `M ${positions[0].x} ${positions[0].y}`;
    for (let i = 0; i < positions.length - 1; i++) {
        const current = positions[i];
        const next = positions[i + 1];
        const previous = positions[Math.max(0, i - 1)];
        const afterNext = positions[Math.min(positions.length - 1, i + 2)];
        const control1 = {
            x: current.x + (next.x - previous.x) / 6,
            y: current.y + (next.y - previous.y) / 6
        };
        const control2 = {
            x: next.x - (afterNext.x - current.x) / 6,
            y: next.y - (afterNext.y - current.y) / 6
        };
        path += ` C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${next.x} ${next.y}`;
    }
    return path;
}

/** Desenha ramificações e sinapses discretas ao redor da espinha neural. */
function updateNeuralNetwork(svg, positions) {
    const svgNS = "http://www.w3.org/2000/svg";
    let network = svg.querySelector(".organic-menu__network");
    if (!network) {
        network = document.createElementNS(svgNS, "g");
        network.setAttribute("class", "organic-menu__network");
        svg.querySelector(".organic-menu__path-core")?.after(network);
    }
    network.replaceChildren();

    const width = svg.clientWidth;
    const branchTips = [];
    const branchPatterns = [
        [{ dx: -18, dy: -24, bend: -10, twig: -10 }, { dx: 12, dy: -31, bend: 5, twig: 9 }, { dx: -10, dy: 17, bend: 8, twig: 9 }],
        [{ dx: 19, dy: -25, bend: -12, twig: -9 }, { dx: -14, dy: 19, bend: 9, twig: 10 }],
        [{ dx: -20, dy: -23, bend: 10, twig: -9 }, { dx: 15, dy: 17, bend: -8, twig: 10 }, { dx: 6, dy: -32, bend: -5, twig: -8 }],
        [{ dx: 18, dy: -19, bend: 9, twig: -9 }, { dx: -13, dy: 25, bend: -12, twig: 8 }],
        [{ dx: -17, dy: -22, bend: -9, twig: -8 }, { dx: 12, dy: 23, bend: 7, twig: 10 }],
        [{ dx: 19, dy: -24, bend: -8, twig: -10 }, { dx: -16, dy: 18, bend: 11, twig: 9 }],
        [{ dx: -14, dy: -25, bend: 9, twig: -8 }, { dx: 18, dy: -17, bend: -7, twig: -9 }, { dx: -8, dy: 20, bend: 5, twig: 10 }]
    ];

    positions.forEach((position, index) => {
        const neuron = document.createElementNS(svgNS, "g");
        neuron.setAttribute("class", "organic-menu__neuron");
        neuron.setAttribute("data-index", index);
        const tips = [];

        (branchPatterns[index] || branchPatterns[0]).forEach((shape, branchIndex) => {
            const direction = Math.sign(shape.dx);
            const endX = Math.max(3, Math.min(width - 3, position.x + shape.dx));
            const endY = position.y + shape.dy;
            const startX = position.x + direction * 3;
            const controlX = startX + (endX - startX) * 0.55;
            const controlY = position.y + shape.bend;
            const branch = document.createElementNS(svgNS, "path");
            branch.setAttribute("class", "organic-menu__dendrite");
            branch.setAttribute("d", `M ${startX} ${position.y} C ${controlX} ${controlY}, ${controlX} ${endY}, ${endX} ${endY}`);
            neuron.appendChild(branch);

            const twigStartX = startX + (endX - startX) * 0.58;
            const twigStartY = position.y + (endY - position.y) * 0.58;
            const twigEndX = Math.max(2, Math.min(width - 2, twigStartX + direction * 8));
            const twigEndY = twigStartY + shape.twig;
            const twig = document.createElementNS(svgNS, "path");
            twig.setAttribute("class", "organic-menu__dendrite organic-menu__dendrite--twig");
            twig.setAttribute("d", `M ${twigStartX} ${twigStartY} Q ${twigStartX + direction * 5} ${twigStartY + shape.twig * 0.35}, ${twigEndX} ${twigEndY}`);
            neuron.appendChild(twig);

            tips.push({ x: endX, y: endY });
        });

        tips.forEach((tip, tipIndex) => {
            const synapse = document.createElementNS(svgNS, "circle");
            synapse.setAttribute("class", "organic-menu__synapse");
            synapse.setAttribute("cx", tip.x);
            synapse.setAttribute("cy", tip.y);
            synapse.setAttribute("r", tipIndex % 2 === 0 ? "1.6" : "1.2");
            neuron.appendChild(synapse);
        });

        branchTips.push(tips);
        network.appendChild(neuron);
    });

    for (let i = 0; i < branchTips.length - 1; i++) {
        const firstTips = branchTips[i];
        const nextTips = branchTips[i + 1];
        const first = firstTips[firstTips.length - 1];
        const next = nextTips[0];
        const link = document.createElementNS(svgNS, "path");
        link.setAttribute("class", "organic-menu__synaptic-link");
        link.setAttribute("data-index", i);
        link.setAttribute("d", `M ${first.x} ${first.y} C ${first.x + 8} ${first.y + 22}, ${next.x - 8} ${next.y - 22}, ${next.x} ${next.y}`);
        network.appendChild(link);
    }
}

/** Constrói uma dupla hélice animada que acompanha os centros dos itens. */
function updateDnaSpine(svg, positions) {
    const svgNS = "http://www.w3.org/2000/svg";
    let dna = svg.querySelector(".organic-menu__dna");
    if (!dna) {
        dna = document.createElementNS(svgNS, "g");
        dna.setAttribute("class", "organic-menu__dna");
        svg.querySelector(".organic-menu__path-core")?.after(dna);
    }
    dna.replaceChildren();
    if (positions.length < 2) return;

    const amplitude = Math.min(7, svg.clientWidth * 0.09);
    const createPath = (className, d) => {
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("class", className);
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        return path;
    };

    positions.slice(0, -1).forEach((start, index) => {
        const end = positions[index + 1];
        const segment = document.createElementNS(svgNS, "g");
        segment.setAttribute("class", "organic-menu__dna-segment");
        segment.style.setProperty("--segment-delay", `${index * -0.55}s`);

        const strands = [[], []];
        const sampleCount = 12;
        for (let i = 0; i <= sampleCount; i++) {
            const t = 0.22 + (i / sampleCount) * 0.56;
            const x = start.x + (end.x - start.x) * t;
            const y = start.y + (end.y - start.y) * t;
            const twist = Math.sin((t - 0.22) / 0.56 * Math.PI * 2);
            strands[0].push({ x: x - amplitude * twist, y });
            strands[1].push({ x: x + amplitude * twist, y });
        }

        strands.forEach((points, strandIndex) => {
            const path = createOrganicPath(points);
            const side = strandIndex === 0 ? "left" : "right";
            segment.appendChild(createPath(`organic-menu__dna-strand organic-menu__dna-strand--${side}`, path));

            const signal = createPath(`organic-menu__dna-signal organic-menu__dna-signal--${side}`, path);
            signal.setAttribute("pathLength", "100");
            segment.appendChild(signal);
        });

        [0.3, 0.5, 0.7].forEach((t, rungIndex) => {
            const x = start.x + (end.x - start.x) * t;
            const y = start.y + (end.y - start.y) * t;
            const twist = Math.sin((t - 0.22) / 0.56 * Math.PI * 2);
            const rung = createPath(
                "organic-menu__dna-rung",
                `M ${x - amplitude * twist} ${y} L ${x + amplitude * twist} ${y}`
            );
            rung.setAttribute("data-index", index);
            rung.style.setProperty("--rung-delay", `${rungIndex * -0.3}s`);
            segment.appendChild(rung);
        });

        dna.appendChild(segment);
    });
}

/** Path de conexão entre nó selecionado e nó em preview (curva lateral) */
function createConnectionPath(selected, preview) {
    if (!selected || !preview) return "";
    const startX = Number(selected.dataset.baseX);
    const startY = Number(selected.dataset.y);
    const endX = Number(preview.dataset.baseX);
    const endY = Number(preview.dataset.y);
    const midY = (startY + endY) / 2;
    const offsetX = Math.min(startX, endX) - 18;
    return `M ${startX} ${startY} C ${offsetX} ${startY}, ${offsetX} ${midY}, ${offsetX} ${midY} C ${offsetX} ${endY}, ${endX} ${endY}, ${endX} ${endY}`;
}

/** Cria o SVG da rede neural atmosférica */
function createOrganicSVGLegacy(nodeCount) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "organic-menu__svg");
    svg.setAttribute("viewBox", "0 0 88 760");
    svg.setAttribute("aria-hidden", "true");
    svg.style.height = "100%";
    svg.style.position = "absolute";
    svg.style.left = "0";
    svg.style.top = "0";
    svg.style.pointerEvents = "none";
    svg.style.filter = "none";

    const defs = document.createElementNS(svgNS, "defs");

    // Textura sutil do painel
    const noisePattern = document.createElementNS(svgNS, "pattern");
    noisePattern.setAttribute("id", "unknowns-grain");
    noisePattern.setAttribute("patternUnits", "userSpaceOnUse");
    noisePattern.setAttribute("width", "64");
    noisePattern.setAttribute("height", "64");
    const noiseBg = document.createElementNS(svgNS, "rect");
    noiseBg.setAttribute("width", "64");
    noiseBg.setAttribute("height", "64");
    noiseBg.setAttribute("fill", "#030304");
    noisePattern.appendChild(noiseBg);
    for (let x = 0; x < 64; x += 2) {
        for (let y = 0; y < 64; y += 2) {
            if (Math.random() > 0.92) {
                const pixel = document.createElementNS(svgNS, "rect");
                pixel.setAttribute("x", x);
                pixel.setAttribute("y", y);
                pixel.setAttribute("width", "1");
                pixel.setAttribute("height", "1");
                pixel.setAttribute("fill", "rgba(255,255,255," + (0.015 + Math.random() * 0.025) + ")");
                noisePattern.appendChild(pixel);
            }
        }
    }
    for (let y = 0; y < 64; y += 4) {
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", "0");
        line.setAttribute("y1", y);
        line.setAttribute("x2", "64");
        line.setAttribute("y2", y);
        line.setAttribute("stroke", "rgba(255,255,255,0.008)");
        line.setAttribute("stroke-width", "0.5");
        noisePattern.appendChild(line);
    }
    defs.appendChild(noisePattern);

    // Gradiente da espinha neural, discreto em repouso.
    const lineGrad = document.createElementNS(svgNS, "linearGradient");
    lineGrad.setAttribute("id", "organic-line-gradient");
    lineGrad.setAttribute("x1", "0%");
    lineGrad.setAttribute("y1", "0%");
    lineGrad.setAttribute("x2", "0%");
    lineGrad.setAttribute("y2", "100%");
    const lineStops = [
        { offset: "0%",   color: "rgba(245,158,11,0.08)" },
        { offset: "20%",  color: "rgba(245,158,11,0.18)" },
        { offset: "50%",  color: "rgba(151,180,164,0.16)" },
        { offset: "80%",  color: "rgba(245,158,11,0.18)" },
        { offset: "100%", color: "rgba(245,158,11,0.08)" }
    ];
    lineStops.forEach(s => {
        const stop = document.createElementNS(svgNS, "stop");
        stop.setAttribute("offset", s.offset);
        stop.setAttribute("stop-color", s.color);
        lineGrad.appendChild(stop);
    });
    defs.appendChild(lineGrad);

    // Glow do nó ATIVO — forte, âmbar/laranja quente, pulsa
    const glowGrad = document.createElementNS(svgNS, "radialGradient");
    glowGrad.setAttribute("id", "node-glow-active");
    glowGrad.setAttribute("cx", "50%");
    glowGrad.setAttribute("cy", "50%");
    glowGrad.setAttribute("r", "50%");
    [
        { offset: "0%",   color: "rgba(255,200,40,0.95)" },
        { offset: "30%",  color: "rgba(255,160,20,0.7)" },
        { offset: "60%",  color: "rgba(255,100,10,0.35)" },
        { offset: "85%",  color: "rgba(200,50,5,0.12)" },
        { offset: "100%", color: "rgba(150,30,0,0)" }
    ].forEach(s => {
        const stop = document.createElementNS(svgNS, "stop");
        stop.setAttribute("offset", s.offset);
        stop.setAttribute("stop-color", s.color);
        glowGrad.appendChild(stop);
    });
    defs.appendChild(glowGrad);

    // Glow do nó HOVER/PREVIEW — âmbar suave, sem vermelho
    const glowHoverGrad = document.createElementNS(svgNS, "radialGradient");
    glowHoverGrad.setAttribute("id", "node-glow-hover");
    glowHoverGrad.setAttribute("cx", "50%");
    glowHoverGrad.setAttribute("cy", "50%");
    glowHoverGrad.setAttribute("r", "50%");
    [
        { offset: "0%",   color: "rgba(255,195,35,0.45)" },
        { offset: "50%",  color: "rgba(255,160,20,0.18)" },
        { offset: "100%", color: "rgba(255,130,10,0)" }
    ].forEach(s => {
        const stop = document.createElementNS(svgNS, "stop");
        stop.setAttribute("offset", s.offset);
        stop.setAttribute("stop-color", s.color);
        glowHoverGrad.appendChild(stop);
    });
    defs.appendChild(glowHoverGrad);

    // Nó INATIVO — muito discreto, quase só silhueta na linha
    const nodeDefaultGrad = document.createElementNS(svgNS, "radialGradient");
    nodeDefaultGrad.setAttribute("id", "node-default");
    nodeDefaultGrad.setAttribute("cx", "30%");
    nodeDefaultGrad.setAttribute("cy", "30%");
    nodeDefaultGrad.setAttribute("r", "70%");
    [
        { offset: "0%",   color: "rgba(245,197,24,0.18)" },
        { offset: "60%",  color: "rgba(245,158,11,0.06)" },
        { offset: "100%", color: "rgba(139,69,19,0.03)" }
    ].forEach(s => {
        const stop = document.createElementNS(svgNS, "stop");
        stop.setAttribute("offset", s.offset);
        stop.setAttribute("stop-color", s.color);
        nodeDefaultGrad.appendChild(stop);
    });
    defs.appendChild(nodeDefaultGrad);

    // Nó indisponível
    const nodeDisabledGrad = document.createElementNS(svgNS, "radialGradient");
    nodeDisabledGrad.setAttribute("id", "node-disabled");
    nodeDisabledGrad.setAttribute("cx", "30%");
    nodeDisabledGrad.setAttribute("cy", "30%");
    nodeDisabledGrad.setAttribute("r", "70%");
    [
        { offset: "0%",   color: "rgba(139,139,158,0.15)" },
        { offset: "60%",  color: "rgba(100,100,110,0.06)" },
        { offset: "100%", color: "rgba(60,60,70,0.03)" }
    ].forEach(s => {
        const stop = document.createElementNS(svgNS, "stop");
        stop.setAttribute("offset", s.offset);
        stop.setAttribute("stop-color", s.color);
        nodeDisabledGrad.appendChild(stop);
    });
    defs.appendChild(nodeDisabledGrad);

    // Anel interno (núcleo âmbar puro) — só no ativo
    const innerGrad = document.createElementNS(svgNS, "radialGradient");
    innerGrad.setAttribute("id", "node-inner");
    innerGrad.setAttribute("cx", "50%");
    innerGrad.setAttribute("cy", "50%");
    innerGrad.setAttribute("r", "50%");
    [
        { offset: "0%",   color: "#fff8e0" },
        { offset: "100%", color: "#ffc830" }
    ].forEach(s => {
        const stop = document.createElementNS(svgNS, "stop");
        stop.setAttribute("offset", s.offset);
        stop.setAttribute("stop-color", s.color);
        innerGrad.appendChild(stop);
    });
    defs.appendChild(innerGrad);

    // Filtro blur suave
    const blurFilter = document.createElementNS(svgNS, "filter");
    blurFilter.setAttribute("id", "soft-glow");
    blurFilter.setAttribute("x", "-100%");
    blurFilter.setAttribute("y", "-100%");
    blurFilter.setAttribute("width", "300%");
    blurFilter.setAttribute("height", "300%");
    const feGaussian = document.createElementNS(svgNS, "feGaussianBlur");
    feGaussian.setAttribute("stdDeviation", "4");
    feGaussian.setAttribute("result", "blur");
    blurFilter.appendChild(feGaussian);
    const feMerge = document.createElementNS(svgNS, "feMerge");
    const feMergeNode1 = document.createElementNS(svgNS, "feMergeNode");
    feMergeNode1.setAttribute("in", "blur");
    const feMergeNode2 = document.createElementNS(svgNS, "feMergeNode");
    feMergeNode2.setAttribute("in", "SourceGraphic");
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    blurFilter.appendChild(feMerge);
    defs.appendChild(blurFilter);

    // Filtro FORTE para nó ativo — expansão de luz
    const strongGlowFilter = document.createElementNS(svgNS, "filter");
    strongGlowFilter.setAttribute("id", "strong-glow");
    strongGlowFilter.setAttribute("x", "-200%");
    strongGlowFilter.setAttribute("y", "-200%");
    strongGlowFilter.setAttribute("width", "500%");
    strongGlowFilter.setAttribute("height", "500%");
    const feGaussian2 = document.createElementNS(svgNS, "feGaussianBlur");
    feGaussian2.setAttribute("stdDeviation", "10");
    feGaussian2.setAttribute("result", "blur");
    strongGlowFilter.appendChild(feGaussian2);
    const feMerge2 = document.createElementNS(svgNS, "feMerge");
    const feMergeNode3 = document.createElementNS(svgNS, "feMergeNode");
    feMergeNode3.setAttribute("in", "blur");
    const feMergeNode4 = document.createElementNS(svgNS, "feMergeNode");
    feMergeNode4.setAttribute("in", "blur");
    const feMergeNode5 = document.createElementNS(svgNS, "feMergeNode");
    feMergeNode5.setAttribute("in", "SourceGraphic");
    feMerge2.appendChild(feMergeNode3);
    feMerge2.appendChild(feMergeNode4);
    feMerge2.appendChild(feMergeNode5);
    strongGlowFilter.appendChild(feMerge2);
    defs.appendChild(strongGlowFilter);

    // Gradiente da linha de conexão (ativo → hover)
    const connGrad = document.createElementNS(svgNS, "linearGradient");
    connGrad.setAttribute("id", "connection-gradient");
    connGrad.setAttribute("x1", "0%");
    connGrad.setAttribute("y1", "0%");
    connGrad.setAttribute("x2", "100%");
    connGrad.setAttribute("y2", "0%");
    [
        { offset: "0%",   color: "rgba(255,200,40,0.9)" },
        { offset: "50%",  color: "rgba(255,220,80,1)" },
        { offset: "100%", color: "rgba(255,200,40,0.9)" }
    ].forEach(s => {
        const stop = document.createElementNS(svgNS, "stop");
        stop.setAttribute("offset", s.offset);
        stop.setAttribute("stop-color", s.color);
        connGrad.appendChild(stop);
    });
    defs.appendChild(connGrad);

    svg.appendChild(defs);

    // Fundo textura
    const bgRect = document.createElementNS(svgNS, "rect");
    bgRect.setAttribute("width", "100%");
    bgRect.setAttribute("height", "100%");
    bgRect.setAttribute("fill", "url(#unknowns-grain)");
    svg.appendChild(bgRect);

    // Vignette
    const vignetteGrad = document.createElementNS(svgNS, "radialGradient");
    vignetteGrad.setAttribute("id", "vignette");
    vignetteGrad.setAttribute("cx", "50%");
    vignetteGrad.setAttribute("cy", "50%");
    vignetteGrad.setAttribute("r", "70%");
    [
        { offset: "0%",   color: "rgba(0,0,0,0)" },
        { offset: "70%",  color: "rgba(0,0,0,0)" },
        { offset: "100%", color: "rgba(0,0,0,0.6)" }
    ].forEach(s => {
        const stop = document.createElementNS(svgNS, "stop");
        stop.setAttribute("offset", s.offset);
        stop.setAttribute("stop-color", s.color);
        vignetteGrad.appendChild(stop);
    });
    defs.appendChild(vignetteGrad);
    const vignetteRect = document.createElementNS(svgNS, "rect");
    vignetteRect.setAttribute("width", "100%");
    vignetteRect.setAttribute("height", "100%");
    vignetteRect.setAttribute("fill", "url(#vignette)");
    vignetteRect.setAttribute("pointer-events", "none");
    svg.appendChild(vignetteRect);

    // Linha principal — espinha dorsal sutil
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("class", "organic-menu__path");
    path.setAttribute("d", ORGANIC_PATH.trim());
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "url(#organic-line-gradient)");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.style.filter = "url(#soft-glow)";
    svg.appendChild(path);

    // Linha central fina
    const pathCore = document.createElementNS(svgNS, "path");
    pathCore.setAttribute("class", "organic-menu__path-core");
    pathCore.setAttribute("d", ORGANIC_PATH.trim());
    pathCore.setAttribute("fill", "none");
    pathCore.setAttribute("stroke", "rgba(255,255,255,0.05)");
    pathCore.setAttribute("stroke-width", "1");
    pathCore.setAttribute("stroke-linecap", "round");
    pathCore.setAttribute("stroke-linejoin", "round");
    svg.appendChild(pathCore);

    const dna = document.createElementNS(svgNS, "g");
    dna.setAttribute("class", "organic-menu__dna");
    svg.appendChild(dna);

    const initialPositions = getNodePositions(ORGANIC_PATH, nodeCount);
    const network = document.createElementNS(svgNS, "g");
    network.setAttribute("class", "organic-menu__network");
    svg.appendChild(network);

    // Linha de conexão (ativo → hover) — curva lateral suave
    const connectionPath = document.createElementNS(svgNS, "path");
    connectionPath.setAttribute("class", "organic-menu__path-connection");
    connectionPath.setAttribute("fill", "none");
    connectionPath.setAttribute("stroke", "url(#connection-gradient)");
    connectionPath.setAttribute("stroke-width", "3.5");
    connectionPath.setAttribute("stroke-linecap", "round");
    connectionPath.setAttribute("stroke-linejoin", "round");
    connectionPath.style.filter = "url(#soft-glow)";
    connectionPath.style.opacity = "0";
    connectionPath.style.transition = "opacity 220ms ease, stroke-width 220ms ease";
    svg.appendChild(connectionPath);

    // Nós
    initialPositions.forEach((pos, i) => {
        const nodeX = pos.x;
        const nodeRadius = [4, 5, 4, 5.5, 4, 5, 4][i] ?? 4;
        const group = document.createElementNS(svgNS, "g");
        group.setAttribute("class", "organic-menu__node-group");
        group.setAttribute("data-index", i);
        group.setAttribute("data-origin-x", nodeX);
        group.setAttribute("data-base-x", nodeX);
        group.setAttribute("data-y", pos.y);
        group.setAttribute("data-active", "false");
        group.setAttribute("data-preview", "false");
        group.setAttribute("transform", `translate(${nodeX} ${pos.y})`);
        group.style.setProperty("--node-radius", `${nodeRadius}px`);
        group.style.transition = "transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";

        // Glow ATIVO — grande, forte, pulsa
        const glow = document.createElementNS(svgNS, "circle");
        glow.setAttribute("class", "organic-menu__node-glow");
        glow.setAttribute("r", "18");
        glow.setAttribute("fill", "url(#node-glow-active)");
        glow.style.opacity = "0";
        glow.style.transition = "opacity 350ms ease, r 350ms ease";
        glow.style.filter = "url(#strong-glow)";
        group.appendChild(glow);

        // Glow HOVER/PREVIEW — menor, âmbar suave
        const glowHover = document.createElementNS(svgNS, "circle");
        glowHover.setAttribute("class", "organic-menu__node-glow-hover");
        glowHover.setAttribute("r", "12");
        glowHover.setAttribute("fill", "url(#node-glow-hover)");
        glowHover.style.opacity = "0";
        glowHover.style.transition = "opacity 200ms ease";
        group.appendChild(glowHover);

        // Nó PRINCIPAL — base discreta, cresce no ativo/hover
        const node = document.createElementNS(svgNS, "circle");
        node.setAttribute("class", "organic-menu__node");
        node.setAttribute("r", String(nodeRadius));
        node.setAttribute("fill", "url(#node-default)");
        node.setAttribute("stroke", "var(--border-strong)");
        node.setAttribute("stroke-width", "1.2");
        node.style.transition = "r 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), fill 300ms ease, stroke 300ms ease, stroke-width 300ms ease";
        group.appendChild(node);

        svg.appendChild(group);
    });

    return svg;
}

function createOrganicSVG(nodeCount) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "organic-menu__svg");
    svg.setAttribute("viewBox", "0 0 88 760");
    svg.setAttribute("aria-hidden", "true");
    svg.style.pointerEvents = "none";

    getNodePositions(ORGANIC_PATH, nodeCount).forEach((position, index) => {
        const group = document.createElementNS(svgNS, "g");
        group.setAttribute("class", "organic-menu__node-group");
        group.setAttribute("data-index", index);
        group.setAttribute("data-origin-x", position.x);
        group.setAttribute("data-base-x", position.x);
        group.setAttribute("data-y", position.y);
        group.setAttribute("data-active", "false");
        group.setAttribute("data-preview", "false");
        group.setAttribute("transform", `translate(${position.x} ${position.y})`);

        const glow = document.createElementNS(svgNS, "circle");
        glow.setAttribute("class", "organic-menu__node-glow");
        glow.setAttribute("r", "18");
        group.appendChild(glow);

        const glowHover = document.createElementNS(svgNS, "circle");
        glowHover.setAttribute("class", "organic-menu__node-glow-hover");
        glowHover.setAttribute("r", "12");
        group.appendChild(glowHover);

        const node = document.createElementNS(svgNS, "circle");
        node.setAttribute("class", "organic-menu__node");
        node.setAttribute("r", "4");
        group.appendChild(node);
        svg.appendChild(group);
    });

    return svg;
}

/** Cria um item do menu (botão semântico acessível) */
function createMenuItem(item, index, onNavigate) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "organic-menu__item";
    btn.dataset.page = item.id;
    btn.dataset.index = index;
    if (item.description) btn.title = item.description;
    btn.setAttribute("aria-label", item.label + (item.available ? "" : " — não disponível"));

    if (!item.available) {
        btn.classList.add("organic-menu__item--unavailable");
        btn.disabled = true;
    }

    // Ícone
    const iconWrap = document.createElement("span");
    iconWrap.className = "organic-menu__item-icon";
    iconWrap.innerHTML = ORGANIC_ICONS[item.icon] || ORGANIC_ICONS.settings;
    btn.appendChild(iconWrap);

    // Label
    const label = document.createElement("span");
    label.className = "organic-menu__item-label";
    label.textContent = item.label;
    btn.appendChild(label);

    // Click nativo (mouse, Enter, Espaço)
    btn.addEventListener("click", (e) => {
        if (item.available) selectMenuItem(index, onNavigate);
    });

    // Hover imediato → preview
    btn.addEventListener("mouseenter", () => {
        hoveredIndex = index;
        renderMenuState();
    });
    btn.addEventListener("mouseleave", () => {
        if (hoveredIndex === index) {
            hoveredIndex = null;
            renderMenuState();
        }
    });

    return btn;
}

let selectedIndex = 0;
let hoveredIndex = null;
let focusedIndex = null;
let nodeGroups = [];
let itemsList = null;
let menuResizeObserver = null;

function selectMenuItem(index, onNavigate) {
    const item = MENU_ITEMS[index];
    if (!item?.available || index === selectedIndex || !onNavigate) return;

    onNavigate(item.id);
    selectedIndex = index;
    hoveredIndex = null;
    focusedIndex = null;
    renderMenuState();
    playUiNavigationSound();
}

/** Renderiza estado visual: selecionado (active) vs preview (hover/foco) */
function renderMenuState() {
    const previewIndex = hoveredIndex ?? focusedIndex;
    const hasPreview = previewIndex !== null && previewIndex !== selectedIndex;
    const svg = document.querySelector(".organic-menu__svg");
    svg?.setAttribute("data-has-preview", String(hasPreview));

    // Atualiza nós e itens
    nodeGroups.forEach((group, i) => {
        const isSelected = i === selectedIndex;
        const isPreview = i === previewIndex && !isSelected;
        const itemBtn = itemsList?.querySelector(`[data-index="${i}"]`);

        group.setAttribute("data-active", String(isSelected));
        group.setAttribute("data-preview", String(isPreview));

        const neuron = svg?.querySelector(`.organic-menu__neuron[data-index="${i}"]`);
        neuron?.setAttribute("data-active", String(isSelected));
        neuron?.setAttribute("data-preview", String(isPreview));

        itemBtn?.classList.toggle("organic-menu__item--active", isSelected);
        itemBtn?.classList.toggle("organic-menu__item--preview", isPreview);
        itemBtn?.classList.toggle("organic-menu__item--focused", i === focusedIndex && !isSelected && !isPreview);

        if (isSelected) {
            itemBtn?.setAttribute("aria-current", "page");
            itemBtn?.setAttribute("tabindex", "0");
        } else {
            itemBtn?.removeAttribute("aria-current");
            itemBtn?.setAttribute("tabindex", "-1");
        }
    });

}

/** Alinha nós SVG aos itens do menu e reconstrói path principal */
function alignOrganicMenuNodes(svg) {
    if (!svg || svg.getBoundingClientRect().height === 0) return;

    svg.setAttribute("viewBox", `0 0 ${svg.clientWidth} ${svg.clientHeight}`);
    const matrix = svg.getScreenCTM();
    if (!matrix) return;

    const inverseMatrix = matrix.inverse();
    const positions = [];
    const items = itemsList?.querySelectorAll(".organic-menu__item") || [];

    items.forEach((item, index) => {
        const group = nodeGroups[index];
        if (!group) return;

        const rect = item.getBoundingClientRect();
        const point = svg.createSVGPoint();
        point.x = rect.left;
        point.y = rect.top + rect.height / 2;
        const svgPoint = point.matrixTransform(inverseMatrix);
        const position = {
            x: Number(group.dataset.originX) * svg.clientWidth / 88,
            y: svgPoint.y
        };

        group.setAttribute("data-base-x", position.x);
        group.setAttribute("data-y", position.y);
        group.setAttribute("transform", `translate(${position.x} ${position.y})`);
        positions.push(position);
    });

    renderMenuState();
}

/** Inicializa o menu orgânico */
function initOrganicMenu(onNavigate) {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    // Limpa instância anterior
    window.organicMenuAPI?.destroy();

    sidebar.innerHTML = "";
    sidebar.style.removeProperty("background");
    sidebar.style.removeProperty("border-right");

    // Container principal
    const menuContainer = document.createElement("div");
    menuContainer.className = "organic-menu";
    menuContainer.setAttribute("role", "navigation");
    menuContainer.setAttribute("aria-label", "Menu principal Unknowns Lab");
    menuContainer.style.setProperty("--transition-duration", "300ms");

    // Header com marca
    const header = document.createElement("div");
    header.className = "organic-menu__header";
    header.innerHTML = `<span class="organic-menu__brand-mark" aria-hidden="true"></span><span class="organic-menu__brand-copy"><strong>UNKNOWN'S LAB</strong><small>CONTROL CENTER</small></span>`;
    menuContainer.appendChild(header);

    // SVG orgânico
    const svg = createOrganicSVG(MENU_ITEMS.length);
    menuContainer.appendChild(svg);

    // Referências dos grupos de nós
    nodeGroups = Array.from(svg.querySelectorAll(".organic-menu__node-group"));

    // Lista de itens (semântica, fora do SVG)
    itemsList = document.createElement("div");
    itemsList.className = "organic-menu__items";
    itemsList.setAttribute("role", "list");

    MENU_ITEMS.forEach((item, i) => {
        const btn = createMenuItem(item, i, onNavigate);
        const li = document.createElement("li");
        li.className = "organic-menu__list-item";
        li.setAttribute("role", "listitem");
        li.appendChild(btn);
        itemsList.appendChild(li);
    });

    menuContainer.appendChild(itemsList);
    sidebar.appendChild(menuContainer);

    const soundsToggle = document.getElementById("ui-sounds-toggle");
    const soundsStatus = document.getElementById("ui-sounds-status");
    if (soundsToggle) {
        soundsToggle.checked = uiSoundsEnabled;
        soundsToggle.addEventListener("change", () => {
            uiSoundsEnabled = soundsToggle.checked;
            try {
                localStorage.setItem(UI_SOUND_STORAGE_KEY, String(uiSoundsEnabled));
                if (soundsStatus) soundsStatus.textContent = "";
            } catch (error) {
                if (soundsStatus) {
                    soundsStatus.textContent = "Não foi possível salvar esta preferência neste ambiente.";
                }
                console.error("Não foi possível salvar a preferência de sons da interface:", error);
            }
        });
    }

    // Observer para realinhar ao redimensionar
    menuResizeObserver = new ResizeObserver(() => alignOrganicMenuNodes(svg));
    menuResizeObserver.observe(menuContainer);
    menuResizeObserver.observe(itemsList);
    alignOrganicMenuNodes(svg);

    // Footer
    const footer = document.createElement("div");
    footer.className = "organic-menu__footer";
    footer.innerHTML = `<span>UNKNOWNS LAB</span> <strong>v0.1.0</strong>`;
    menuContainer.appendChild(footer);

    // Navegação por teclado (apenas foco, não seleciona)
    menuContainer.addEventListener("keydown", (e) => {
        if (!["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(e.key)) return;

        const availableIndices = MENU_ITEMS
            .map((m, i) => m.available ? i : -1)
            .filter(i => i >= 0);

        if (availableIndices.length === 0) return;

        const currentIndex = focusedIndex ?? selectedIndex;
        let newIndex = currentIndex;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            const idx = availableIndices.findIndex(i => i > currentIndex);
            newIndex = availableIndices[idx >= 0 ? idx : 0];
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const idx = availableIndices.findLastIndex(i => i < currentIndex);
            newIndex = availableIndices[idx >= 0 ? idx : availableIndices.length - 1];
        } else if (e.key === "Home") {
            e.preventDefault();
            newIndex = availableIndices[0];
        } else if (e.key === "End") {
            e.preventDefault();
            newIndex = availableIndices[availableIndices.length - 1];
        } else if (e.key === "Enter" || e.key === " ") {
            // Enter/Space confirma a navegação no item focado
            e.preventDefault();
            if (focusedIndex !== null) selectMenuItem(focusedIndex, onNavigate);
            return;
        }

        if (newIndex !== currentIndex) {
            focusedIndex = newIndex;
            renderMenuState();
            const btn = itemsList.querySelector(`[data-index="${newIndex}"]`);
            btn?.focus();
        }
    });

    // Foco visível (teclado) → preview temporário
    menuContainer.addEventListener("focusin", (e) => {
        const item = e.target.closest(".organic-menu__item");
        if (!item) return;
        focusedIndex = Number(item.dataset.index);
        renderMenuState();
    });

    menuContainer.addEventListener("focusout", (e) => {
        if (menuContainer.contains(e.relatedTarget)) return;
        focusedIndex = null;
        renderMenuState();
    });

    // prefers-reduced-motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleReducedMotion = (e) => {
        menuContainer.style.setProperty("--transition-duration", e.matches ? "0ms" : "300ms");
        document.documentElement.style.setProperty("--organic-transition", e.matches ? "0ms" : "400ms");
    };
    prefersReduced.addEventListener("change", handleReducedMotion);
    handleReducedMotion(prefersReduced);

    // API global
    window.organicMenuAPI = {
        setActivePage: (pageId) => {
            const index = MENU_ITEMS.findIndex(m => m.id === pageId);
            if (index >= 0) {
                selectedIndex = index;
                hoveredIndex = null;
                focusedIndex = null;
                renderMenuState();
            }
        },
        destroy: () => {
            prefersReduced.removeEventListener("change", handleReducedMotion);
            menuResizeObserver?.disconnect();
        }
    };

    // Estado inicial
    selectedIndex = 0;
    hoveredIndex = null;
    focusedIndex = null;
    renderMenuState();
}

/** Sincroniza menu com navegação existente */
function syncOrganicMenu(pageId) {
    window.organicMenuAPI?.setActivePage(pageId);
}

// Expor globalmente
window.initOrganicMenu = initOrganicMenu;
window.syncOrganicMenu = syncOrganicMenu;