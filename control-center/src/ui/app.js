/* =========================================================
   APP.JS — Orquestrador da UI
   Navegação, renderização de módulos e integração com
   o ModuleManager via IPC (renderer não tem require()).
   Neste estágio usa fetch() para se comunicar com o
   manager exposto via preload / contextBridge.

   NOTA: No Electron com contextIsolation: true, o renderer
   não pode chamar require(). A comunicação com serviços
   Node.js acontece via window.electronAPI (preload.js).
   O ModuleManager roda no processo MAIN — adicionaremos
   os handlers IPC quando cada módulo for implementado.
   Na Fase 1, o renderer consulta um estado estático
   derivado do registry, sem IPC real de módulos.
========================================================= */

/* ──────────────────────────────────────────────────────────
   REGISTRY EMBUTIDO NO RENDERER
   (duplicado mínimo do registry para o renderer,
    sem require() — será substituído por IPC na Fase 3)
────────────────────────────────────────────────────────── */

const REGISTRY = [
    { id: "keyboard-visualizer",  name: "Keyboard Visualizer",  desc: "Exibe as teclas pressionadas em tempo real na overlay do OBS.", category: "overlay",   icon: "keyboard",        implemented: true  },
    { id: "mouse-visualizer",     name: "Mouse Visualizer",     desc: "Exibe cliques, botões laterais e scroll do mouse na overlay.", category: "overlay",   icon: "mouse-pointer-2", implemented: false },
    { id: "keystroke-history",    name: "Keystroke History",    desc: "Histórico das últimas teclas pressionadas, em faixa deslizante.", category: "overlay", icon: "history",         implemented: false },
    { id: "pubg-stats-overlay",   name: "PUBG Stats Overlay",   desc: "Exibe kills, damage, partidas e arma preferida via servidor local.", category: "overlay", icon: "bar-chart-2", implemented: true  },
    { id: "movement-wasd",        name: "WASD Trainer",         desc: "Exercícios de movimentação básica com visualização de sequência.", category: "movement", icon: "move",         implemented: false },
    { id: "movement-strafe",      name: "Strafe Trainer",       desc: "Exercícios de strafe lateral com análise de ritmo e precisão.", category: "movement",  icon: "arrow-left-right", implemented: false },
    { id: "movement-sprint",      name: "Sprint / Crouch",      desc: "Sequências de sprint, agachamento e prone com visualização.", category: "movement",    icon: "zap",           implemented: false },
    { id: "movement-jump-vault",  name: "Jump & Vault",         desc: "Exercícios de salto e vault com detecção de timing.", category: "movement",           icon: "chevrons-up",   implemented: false },
    { id: "session-recorder",     name: "Session Recorder",     desc: "Grava eventos de teclado e mouse da sessão para análise posterior.", category: "analysis", icon: "circle-dot", implemented: false },
    { id: "event-timeline",       name: "Event Timeline",       desc: "Visualiza a linha do tempo de inputs de uma sessão gravada.", category: "analysis",     icon: "activity",      implemented: false },
    { id: "input-intervals",      name: "Input Intervals",      desc: "Analisa intervalos entre eventos para detectar padrões de ritmo.", category: "analysis", icon: "timer",        implemented: false },
    { id: "obs-integration",      name: "OBS Integration",      desc: "Gerencia Browser Sources no OBS via obs-websocket.", category: "streaming",            icon: "radio",         implemented: false },
    { id: "tutorial-mode",        name: "Tutorial Mode",        desc: "Ativa layout especial para gravação de tutoriais com anotações.", category: "streaming", icon: "presentation", implemented: false }
];

/* Estado local da UI (sincronizado com main process via IPC futuramente) */
const uiState = {};
REGISTRY.forEach(m => {
    uiState[m.id] = m.implemented ? "OFF" : "UNAVAILABLE";
});


/* ──────────────────────────────────────────────────────────
   ÍCONES SVG
────────────────────────────────────────────────────────── */

const ICONS = {
    "keyboard":        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5"/><path d="M12 7V5"/><path d="M16 7V5"/><path d="M6 11h.01"/><path d="M10 11h.01"/><path d="M14 11h.01"/><path d="M18 11h.01"/><path d="M8 15h8"/></svg>`,
    "mouse-pointer-2": `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 4 7.07 17 2.51-7.39L21 11.07z"/></svg>`,
    "history":         `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`,
    "bar-chart-2":     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    "move":            `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>`,
    "arrow-left-right":`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>`,
    "zap":             `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    "chevrons-up":     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>`,
    "circle-dot":      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
    "activity":        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    "timer":           `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="2" x2="14" y2="2"/><path d="M12 14v-4"/><path d="M4 13a8 8 0 1 0 8-7 8 8 0 0 0-8 7"/></svg>`,
    "radio":           `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M7.76 7.76a6 6 0 0 0 0 8.49"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/></svg>`,
    "presentation":    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/></svg>`,
    "settings":        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
};

const STATE_LABELS = {
    "OFF":         "Desativado",
    "ON":          "Ativo",
    "STARTING":    "Iniciando…",
    "STOPPING":    "Parando…",
    "ERROR":       "Erro",
    "UNAVAILABLE": "Indisponível"
};


/* ──────────────────────────────────────────────────────────
   CRIAÇÃO DE CARDS
────────────────────────────────────────────────────────── */

function escHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function createCard(def) {
    const state = uiState[def.id] ?? "UNAVAILABLE";
    const isUnavailable = state === "UNAVAILABLE";
    const isOn          = state === "ON";
    const isBusy        = state === "STARTING" || state === "STOPPING";
    const isError       = state === "ERROR";
    const toggleDisabled = isUnavailable || isBusy;
    const icon = ICONS[def.icon] ?? ICONS["settings"];

    const el = document.createElement("div");
    el.className = `module-card module-card--${state.toLowerCase()}`;
    el.dataset.id = def.id;

    el.innerHTML = `
        <div class="module-card__header">
            <div class="module-card__icon-wrap">${icon}</div>
            <div class="module-card__info">
                <p class="module-card__name">${escHtml(def.name)}</p>
                <p class="module-card__desc">${escHtml(def.desc)}</p>
            </div>
        </div>
        <div class="module-card__actions">
            <div class="module-card__status">
                <span class="module-card__status-dot"></span>
                <span class="module-card__status-text">${STATE_LABELS[state]}</span>
            </div>
            <div class="module-card__btn-group">
                <label class="toggle ${toggleDisabled ? "toggle--disabled" : ""}"
                       title="${isUnavailable ? "Não implementado nesta versão" : ""}">
                    <input
                        type="checkbox"
                        ${isOn ? "checked" : ""}
                        ${toggleDisabled ? "disabled" : ""}
                        data-toggle="${escHtml(def.id)}"
                    >
                    <span class="toggle__track"></span>
                    <span class="toggle__thumb"></span>
                </label>
            </div>
        </div>
        ${isError ? `<p class="module-card__error-msg">Erro ao iniciar módulo.</p>` : ""}
        ${isUnavailable ? `<p class="module-card__error-msg" style="display:block;background:var(--state-unavailable);color:var(--text-muted)">Será implementado em versão futura.</p>` : ""}
    `;

    /* Toggle handler */
    const input = el.querySelector("[data-toggle]");
    if (input && !toggleDisabled) {
        input.addEventListener("change", async (e) => {
            e.preventDefault();
            await handleToggle(def.id);
        });
    }

    return el;
}

function refreshCard(id) {
    const state = uiState[id];
    const el = document.querySelector(`[data-id="${id}"]`);
    if (!el) return;

    const stateClasses = ["off","on","starting","stopping","error","unavailable"].map(s => `module-card--${s}`);
    stateClasses.forEach(c => el.classList.remove(c));
    el.classList.add(`module-card--${state.toLowerCase()}`);

    const statusText = el.querySelector(".module-card__status-text");
    if (statusText) statusText.textContent = STATE_LABELS[state] ?? state;

    const toggle = el.querySelector("[data-toggle]");
    if (toggle) {
        toggle.checked  = state === "ON";
        toggle.disabled = state === "UNAVAILABLE" || state === "STARTING" || state === "STOPPING";
    }

    updateDashboard();
}


/* ──────────────────────────────────────────────────────────
   TOGGLE HANDLER
   Módulos com IPC real: pubg-stats-overlay, keyboard-visualizer
   Os demais são UNAVAILABLE — toggle desabilitado.
────────────────────────────────────────────────────────── */

/* Módulos que usam IPC com o processo main */
const IPC_MODULES = new Set(["keyboard-visualizer", "pubg-stats-overlay"]);

async function handleToggle(id) {
    const current = uiState[id];

    if (current === "OFF" || current === "ERROR") {

        uiState[id] = "STARTING";
        refreshCard(id);

        try {
            if (IPC_MODULES.has(id)) {
                /* Módulo com serviço real no processo main */
                const result = await window.electronAPI?.moduleStart(id);
                if (!result?.ok) throw new Error(result?.error ?? "Falha ao iniciar.");
            } else if (id === "pubg-stats-overlay") {
                const res = await fetch("http://localhost:5051/api/hoje");
                if (!res.ok) throw new Error(`Servidor retornou HTTP ${res.status}`);
            } else {
                throw new Error("Módulo ainda não implementado.");
            }

            uiState[id] = "ON";
            delete uiState[`${id}__error`];

        } catch (err) {
            uiState[id] = "ERROR";
            uiState[`${id}__error`] = err.message;
        }

    } else if (current === "ON") {

        uiState[id] = "STOPPING";
        refreshCard(id);

        try {
            if (IPC_MODULES.has(id)) {
                await window.electronAPI?.moduleStop(id);
            }
        } catch (_) { /* ignora falha no stop */ }

        uiState[id] = "OFF";

    }

    refreshCard(id);
}


/* ──────────────────────────────────────────────────────────
   RENDERIZAÇÃO POR CATEGORIA
────────────────────────────────────────────────────────── */

function renderGrid(containerId, category) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    const mods = REGISTRY.filter(m => m.category === category);
    mods.forEach(def => container.appendChild(createCard(def)));
}

function renderAll() {
    renderGrid("grid-overlay",   "overlay");
    renderGrid("grid-movement",  "movement");
    renderGrid("grid-analysis",  "analysis");
    renderGrid("grid-streaming", "streaming");
    updateDashboard();
}


/* ──────────────────────────────────────────────────────────
   DASHBOARD
────────────────────────────────────────────────────────── */

function updateDashboard() {
    const available = REGISTRY.filter(m => m.implemented);
    const active    = REGISTRY.filter(m => uiState[m.id] === "ON");
    const unavail   = REGISTRY.filter(m => uiState[m.id] === "UNAVAILABLE");
    const errors    = REGISTRY.filter(m => uiState[m.id] === "ERROR");

    document.getElementById("stat-active").textContent      = active.length;
    document.getElementById("stat-total").textContent       = available.length;
    document.getElementById("stat-unavailable").textContent = unavail.length;
    document.getElementById("stat-errors").textContent      = errors.length;

    /* Grid de ativos */
    const activeGrid = document.getElementById("dashboard-active-grid");
    activeGrid.innerHTML = "";
    if (active.length === 0) {
        activeGrid.innerHTML = `
            <div class="empty-state">
                <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p class="empty-state__text">Nenhum módulo ativo.</p>
            </div>`;
    } else {
        active.forEach(def => activeGrid.appendChild(createCard(def)));
    }

    /* Grid de erros */
    const errorSection = document.getElementById("dashboard-error-section");
    const errorGrid    = document.getElementById("dashboard-error-grid");
    errorGrid.innerHTML = "";
    if (errors.length > 0) {
        errorSection.style.display = "block";
        errors.forEach(def => errorGrid.appendChild(createCard(def)));
    } else {
        errorSection.style.display = "none";
    }
}


/* ──────────────────────────────────────────────────────────
   NAVEGAÇÃO
────────────────────────────────────────────────────────── */

function navigate(pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".sidebar__nav-link").forEach(l => l.classList.remove("active"));

    const page = document.getElementById(`page-${pageId}`);
    if (page) page.classList.add("active");

    const link = document.querySelector(`[data-page="${pageId}"]`);
    if (link) link.classList.add("active");
}

document.querySelectorAll(".sidebar__nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page) navigate(page);
    });
});


/* ──────────────────────────────────────────────────────────
   BUSCA (página Overlay)
────────────────────────────────────────────────────────── */

const searchOverlay = document.getElementById("search-overlay");
if (searchOverlay) {
    searchOverlay.addEventListener("input", () => {
        const q = searchOverlay.value.trim().toLowerCase();
        const cards = document.querySelectorAll("#grid-overlay [data-id]");
        cards.forEach(card => {
            const name = card.querySelector(".module-card__name")?.textContent.toLowerCase() ?? "";
            const desc = card.querySelector(".module-card__desc")?.textContent.toLowerCase() ?? "";
            card.style.display = (name.includes(q) || desc.includes(q)) ? "" : "none";
        });
    });
}


/* ──────────────────────────────────────────────────────────
   TITLEBAR
────────────────────────────────────────────────────────── */

document.getElementById("btn-minimize")?.addEventListener("click", () => {
    window.electronAPI?.minimize();
});

document.getElementById("btn-maximize")?.addEventListener("click", () => {
    window.electronAPI?.maximize();
});

document.getElementById("btn-close")?.addEventListener("click", () => {
    window.electronAPI?.close();
});


/* ──────────────────────────────────────────────────────────
   INIT
────────────────────────────────────────────────────────── */

renderAll();
