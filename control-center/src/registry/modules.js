/* =========================================================
   MODULE REGISTRY
   Catálogo de todos os módulos do PUBG Input Lab.
   Cada módulo é definido aqui com seus metadados.
   O estado inicial é determinado pelo ModuleManager —
   não pelo registro.
========================================================= */

/**
 * @typedef {Object} ModuleDefinition
 * @property {string}   id           - Identificador único e estável.
 * @property {string}   name         - Nome de exibição.
 * @property {string}   desc         - Descrição curta (1 linha).
 * @property {string}   category     - Categoria para agrupamento.
 * @property {string}   icon         - Nome do ícone Lucide.
 * @property {string[]} dependencies - IDs de módulos que devem estar ON primeiro.
 * @property {boolean}  implemented  - false = UNAVAILABLE até a fase de implementação.
 * @property {Object}   defaultConfig - Configurações padrão.
 */

/** @type {ModuleDefinition[]} */
const MODULE_REGISTRY = [

    /* ── OVERLAY ─────────────────────────────────────────── */

    {
        id: "keyboard-visualizer",
        name: "Keyboard Visualizer",
        desc: "Exibe as teclas pressionadas em tempo real na overlay do OBS.",
        category: "overlay",
        icon: "keyboard",
        dependencies: [],
        implemented: false,
        defaultConfig: {
            position: { x: 20, y: 20 },
            theme: "dark",
            keyDisplayMs: 1500,
            showOnlyGameKeys: true,
            opacity: 0.9
        }
    },

    {
        id: "mouse-visualizer",
        name: "Mouse Visualizer",
        desc: "Exibe cliques, botões laterais e scroll do mouse na overlay.",
        category: "overlay",
        icon: "mouse-pointer-2",
        dependencies: [],
        implemented: false,
        defaultConfig: {
            position: { x: 20, y: 140 },
            showScroll: true,
            showSideButtons: true,
            opacity: 0.9
        }
    },

    {
        id: "keystroke-history",
        name: "Keystroke History",
        desc: "Histórico das últimas teclas pressionadas, em faixa deslizante.",
        category: "overlay",
        icon: "history",
        dependencies: [],
        implemented: false,
        defaultConfig: {
            maxEntries: 8,
            fadeMs: 3000
        }
    },

    /* ── PUBG STATS ───────────────────────────────────────── */

    {
        id: "pubg-stats-overlay",
        name: "PUBG Stats Overlay",
        desc: "Exibe kills, damage, partidas e arma preferida via servidor local.",
        category: "overlay",
        icon: "bar-chart-2",
        dependencies: [],
        implemented: true,   // já existe em public/overlay.html
        defaultConfig: {
            serverUrl: "http://localhost:5051",
            refreshMs: 60000
        }
    },

    /* ── MOVEMENT LAB ─────────────────────────────────────── */

    {
        id: "movement-wasd",
        name: "WASD Trainer",
        desc: "Exercícios de movimentação básica com visualização de sequência.",
        category: "movement",
        icon: "move",
        dependencies: [],
        implemented: false,
        defaultConfig: {}
    },

    {
        id: "movement-strafe",
        name: "Strafe Trainer",
        desc: "Exercícios de strafe lateral com análise de ritmo e precisão.",
        category: "movement",
        icon: "arrow-left-right",
        dependencies: [],
        implemented: false,
        defaultConfig: {}
    },

    {
        id: "movement-sprint",
        name: "Sprint / Crouch",
        desc: "Sequências de sprint, agachamento e prone com visualização.",
        category: "movement",
        icon: "zap",
        dependencies: [],
        implemented: false,
        defaultConfig: {}
    },

    {
        id: "movement-jump-vault",
        name: "Jump & Vault",
        desc: "Exercícios de salto e vault com detecção de timing.",
        category: "movement",
        icon: "chevrons-up",
        dependencies: [],
        implemented: false,
        defaultConfig: {}
    },

    /* ── INPUT ANALYSIS ───────────────────────────────────── */

    {
        id: "session-recorder",
        name: "Session Recorder",
        desc: "Grava eventos de teclado e mouse da sessão para análise posterior.",
        category: "analysis",
        icon: "circle-dot",
        dependencies: [],
        implemented: false,
        defaultConfig: {
            outputDir: "./sessions",
            format: "json"
        }
    },

    {
        id: "event-timeline",
        name: "Event Timeline",
        desc: "Visualiza a linha do tempo de inputs de uma sessão gravada.",
        category: "analysis",
        icon: "activity",
        dependencies: ["session-recorder"],
        implemented: false,
        defaultConfig: {}
    },

    {
        id: "input-intervals",
        name: "Input Intervals",
        desc: "Analisa intervalos entre eventos para detectar padrões de ritmo.",
        category: "analysis",
        icon: "timer",
        dependencies: ["session-recorder"],
        implemented: false,
        defaultConfig: {}
    },

    /* ── STREAMING ────────────────────────────────────────── */

    {
        id: "obs-integration",
        name: "OBS Integration",
        desc: "Gerencia Browser Sources no OBS via obs-websocket.",
        category: "streaming",
        icon: "radio",
        dependencies: [],
        implemented: false,
        defaultConfig: {
            host: "localhost",
            port: 4455,
            password: ""
        }
    },

    {
        id: "tutorial-mode",
        name: "Tutorial Mode",
        desc: "Ativa layout especial para gravação de tutoriais com anotações.",
        category: "streaming",
        icon: "presentation",
        dependencies: [],
        implemented: false,
        defaultConfig: {
            showAnnotations: true,
            annotationFontSize: 16
        }
    }

];

/* Mapa por ID para lookup O(1) */
const MODULE_MAP = new Map(
    MODULE_REGISTRY.map(m => [m.id, m])
);

/* Agrupamento por categoria */
const MODULE_BY_CATEGORY = MODULE_REGISTRY.reduce((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod);
    return acc;
}, {});

const CATEGORIES = [
    { id: "overlay",   label: "Overlay",         icon: "layers" },
    { id: "movement",  label: "Movement Lab",     icon: "move" },
    { id: "analysis",  label: "Input Analysis",   icon: "activity" },
    { id: "streaming", label: "Streaming",        icon: "radio" }
];

module.exports = {
    MODULE_REGISTRY,
    MODULE_MAP,
    MODULE_BY_CATEGORY,
    CATEGORIES
};
