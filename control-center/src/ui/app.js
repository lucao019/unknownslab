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
    { id: "mouse-visualizer",     name: "Mouse Visualizer",     desc: "Exibe cliques, botões laterais e scroll do mouse na overlay.", category: "overlay",   icon: "mouse-pointer-2", implemented: true  },
    { id: "crosshair",            name: "Crosshair",            desc: "Mira customizável sempre centralizada na tela. Transparente e click-through.", category: "overlay", icon: "circle-dot",   implemented: true  },
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

/* Config da crosshair — sincronizada com o painel de configuração */
const crosshairConfig = {
    style: "cross",
    color: "#00FF00",
    outlineColor: "#000000",
    outlineEnabled: true,
    opacity: 0.9
};
const crosshairPreviewStorageKey = "crosshair-preview-position";
let crosshairPreviewOffset = { x: 0, y: 0 };


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
    /* Atualiza TODOS os cards com esse id (dashboard + página overlay) */
    document.querySelectorAll(`[data-id="${id}"]`).forEach(el => {
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
    });

    /* Mostra/esconde painel de configuração da crosshair */
    if (id === "crosshair") {
        const panel = document.getElementById("crosshair-panel");
        if (panel) {
            panel.style.display = (state === "ON") ? "block" : "none";
            if (state === "ON") clampCrosshairPreviewPosition();
        }
    }
}


/* ──────────────────────────────────────────────────────────
   TOGGLE HANDLER
   Módulos com IPC real: pubg-stats-overlay, keyboard-visualizer
   Os demais são UNAVAILABLE — toggle desabilitado.
────────────────────────────────────────────────────────── */

/* Módulos que usam IPC com o processo main */
const IPC_MODULES = new Set(["keyboard-visualizer", "mouse-visualizer", "pubg-stats-overlay", "crosshair"]);

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

            /* Liga polling de online quando pubg-stats sobe */
            if (id === "pubg-stats-overlay") startOnlinePoll();

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
            /* Para polling de online quando pubg-stats desce */
            if (id === "pubg-stats-overlay") stopOnlinePoll();
        } catch (_) { /* ignora falha no stop */ }

        uiState[id] = "OFF";

    }

    refreshCard(id);
    updateDashboard();
}


/* ──────────────────────────────────────────────────────────
   PUBG STATS — widget de jogadores online no dashboard
   Polling a cada 60s quando o módulo pubg-stats-overlay
   estiver ON. Para quando estiver OFF.
────────────────────────────────────────────────────────── */

let onlinePollTimer = null;

async function fetchOnlineCount() {
    try {
        const data = await window.electronAPI?.pubgStatsData();
        if (!data) return;

        const count = data.jogadoresOnline ?? data.lastStatus?.jogadoresOnline;
        if (!count) return;

        const card = document.getElementById("stat-card-online");
        const el   = document.getElementById("stat-online-count");
        const sub  = document.getElementById("stat-online-sub");

        if (card) card.style.display = "";
        if (el)  el.textContent  = Number(count).toLocaleString("pt-BR");
        if (sub) sub.textContent = "Steam · " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    } catch (_) { /* servidor offline — mantém último valor */ }
}

function startOnlinePoll() {
    fetchOnlineCount();
    if (!onlinePollTimer) {
        onlinePollTimer = setInterval(fetchOnlineCount, 60_000);
    }
}

function stopOnlinePoll() {
    if (onlinePollTimer) {
        clearInterval(onlinePollTimer);
        onlinePollTimer = null;
    }
    const card = document.getElementById("stat-card-online");
    if (card) card.style.display = "none";
}




/* ──────────────────────────────────────────────────────────
   CROSSHAIR — Painel de configuração
────────────────────────────────────────────────────────── */

function applyCrosshairStyle(style) {
    crosshairConfig.style = style;
    document.querySelectorAll('#crosshair-style-buttons .style-btn, .style-buttons .style-btn').forEach(btn => {
        const selected = btn.dataset.style === style;
        btn.classList.toggle('active', selected);
        btn.setAttribute('aria-pressed', String(selected));
    });
    renderCrosshairPreview();
    sendCrosshairConfig();
}

function renderCrosshairPreview() {
    const canvas = document.getElementById('crosshair-preview-canvas');
    if (!canvas || typeof window.drawCrosshair !== 'function') return;

    const config = {
        ...crosshairConfig,
        color: document.getElementById('crosshair-color')?.value || crosshairConfig.color,
        opacity: Number(document.getElementById('crosshair-opacity')?.value ?? crosshairConfig.opacity),
        size: Number(document.getElementById('crosshair-size')?.value ?? 10),
        thickness: 2,
        gap: 4
    };
    window.drawCrosshair(canvas.getContext('2d'), canvas, config);
}

function sendCrosshairConfig() {
    if (!window.electronAPI || !window.electronAPI.crosshairConfig) return;
    updateDashboard();
    const color         = document.getElementById('crosshair-color')?.value || crosshairConfig.color;
    const outlineColor  = document.getElementById('crosshair-outline-color')?.value || crosshairConfig.outlineColor;
    const outlineEnabled = document.getElementById('crosshair-outline-enabled')?.checked ?? crosshairConfig.outlineEnabled;
    const opacity       = parseFloat(document.getElementById('crosshair-opacity')?.value ?? crosshairConfig.opacity);
    const size          = parseFloat(document.getElementById('crosshair-size')?.value ?? 10);
    renderCrosshairPreview();
    window.electronAPI.crosshairConfig({
        style: crosshairConfig.style,
        color,
        outlineColor,
        outlineEnabled,
        size,
        opacity
    });
}

function syncCrosshairPanel(config, source) {
    if (!config) return;
    const previousConfig = { ...crosshairConfig };
    Object.assign(crosshairConfig, config);
    document.getElementById('crosshair-color').value = config.color;
    document.getElementById('crosshair-opacity').value = config.opacity;
    document.getElementById('crosshair-opacity-value').textContent = Number(config.opacity).toFixed(2);
    document.getElementById('crosshair-size').value = config.size;
    document.getElementById('crosshair-size-value').textContent = config.size;
    document.querySelectorAll('#crosshair-style-buttons .style-btn').forEach(btn => {
        const selected = btn.dataset.style === config.style;
        btn.classList.toggle('active', selected);
        btn.setAttribute('aria-pressed', String(selected));
    });
    renderCrosshairPreview();

    if (source !== 'bind') return;
    const changedControls = [];
    if (previousConfig.style !== config.style) {
        changedControls.push(document.getElementById('crosshair-style-buttons')?.closest('.style-section'));
    }
    if (previousConfig.color !== config.color) {
        changedControls.push(document.getElementById('crosshair-color')?.closest('.config-row'));
    }
    if (previousConfig.size !== config.size) {
        changedControls.push(document.getElementById('crosshair-size')?.closest('.config-row'));
    }

    changedControls.filter(Boolean).forEach(row => {
        row.classList.remove('bind-updated');
        void row.offsetWidth;
        row.classList.add('bind-updated');
        row.addEventListener('animationend', () => row.classList.remove('bind-updated'), { once: true });
    });
}

function initCrosshairPanel() {
    /* Botões de estilo */
    document.querySelectorAll('.style-btn').forEach(btn => {
        btn.addEventListener('click', () => applyCrosshairStyle(btn.dataset.style));
    });

    /* Opacity range — atualizar label em tempo real */
    const opacityInput = document.getElementById('crosshair-opacity');
    const opacityValue = document.getElementById('crosshair-opacity-value');
    if (opacityInput && opacityValue) {
        opacityInput.addEventListener('input', () => {
            opacityValue.textContent = parseFloat(opacityInput.value).toFixed(2);
            renderCrosshairPreview();
        });
    }

    document.getElementById('crosshair-color')?.addEventListener('input', renderCrosshairPreview);

    const sizeInput = document.getElementById('crosshair-size');
    const sizeValue = document.getElementById('crosshair-size-value');
    if (sizeInput && sizeValue) {
        sizeInput.addEventListener('input', () => {
            sizeValue.textContent = sizeInput.value;
            renderCrosshairPreview();
            sendCrosshairConfig();
        });
    }

    /* Botão Aplicar */
    document.getElementById('crosshair-apply-btn')?.addEventListener('click', sendCrosshairConfig);

    initCrosshairPreviewDrag();
    window.electronAPI?.onCrosshairConfigUpdated?.(syncCrosshairPanel);
    window.electronAPI?.getCrosshairConfig?.().then(syncCrosshairPanel).catch(() => {});
    renderCrosshairPreview();
}

function setCrosshairPreviewOffset(x, y, persist = false) {
    const panel = document.getElementById('crosshair-panel');
    const preview = document.querySelector('.crosshair-preview');
    if (!panel || !preview) return;

    const panelBounds = panel.getBoundingClientRect();
    const previewBounds = preview.getBoundingClientRect();
    const baseLeft = previewBounds.left - crosshairPreviewOffset.x;
    const baseTop = previewBounds.top - crosshairPreviewOffset.y;
    const padding = 12;
    const minX = panelBounds.left + padding - baseLeft;
    const maxX = panelBounds.right - padding - previewBounds.width - baseLeft;
    const minY = panelBounds.top + padding - baseTop;
    const maxY = panelBounds.bottom - padding - previewBounds.height - baseTop;

    crosshairPreviewOffset = {
        x: Math.round(Math.max(minX, Math.min(x, maxX))),
        y: Math.round(Math.max(minY, Math.min(y, maxY)))
    };
    preview.style.translate = `${crosshairPreviewOffset.x}px ${crosshairPreviewOffset.y}px`;

    if (persist) {
        try {
            localStorage.setItem(crosshairPreviewStorageKey, JSON.stringify(crosshairPreviewOffset));
        } catch (error) {
            console.error("Falha ao salvar a posição da prévia da mira:", error);
        }
    }
}

function clampCrosshairPreviewPosition() {
    setCrosshairPreviewOffset(crosshairPreviewOffset.x, crosshairPreviewOffset.y);
}

function initCrosshairPreviewDrag() {
    const panel = document.getElementById('crosshair-panel');
    const preview = document.querySelector('.crosshair-preview');
    const handle = document.querySelector('.crosshair-preview__drag-handle');
    if (!panel || !preview || !handle) return;

    try {
        const savedPosition = JSON.parse(localStorage.getItem(crosshairPreviewStorageKey) || "{}");
        if (Number.isFinite(savedPosition.x) && Number.isFinite(savedPosition.y)) {
            crosshairPreviewOffset = { x: savedPosition.x, y: savedPosition.y };
            preview.style.translate = `${savedPosition.x}px ${savedPosition.y}px`;
        }
    } catch (error) {
        console.error("Falha ao carregar a posição da prévia da mira:", error);
    }

    let dragStart = null;
    handle.addEventListener('pointerdown', event => {
        if (!panel.classList.contains('crosshair-config-panel') || panel.style.display === 'none') return;
        event.preventDefault();
        handle.setPointerCapture(event.pointerId);
        dragStart = {
            pointerId: event.pointerId,
            pointerX: event.clientX,
            pointerY: event.clientY,
            offsetX: crosshairPreviewOffset.x,
            offsetY: crosshairPreviewOffset.y
        };
    });

    handle.addEventListener('pointermove', event => {
        if (!dragStart || dragStart.pointerId !== event.pointerId) return;
        setCrosshairPreviewOffset(
            dragStart.offsetX + event.clientX - dragStart.pointerX,
            dragStart.offsetY + event.clientY - dragStart.pointerY
        );
    });

    const finishDrag = event => {
        if (!dragStart || dragStart.pointerId !== event.pointerId) return;
        dragStart = null;
        setCrosshairPreviewOffset(crosshairPreviewOffset.x, crosshairPreviewOffset.y, true);
    };
    handle.addEventListener('pointerup', finishDrag);
    handle.addEventListener('pointercancel', finishDrag);

    handle.addEventListener('keydown', event => {
        const moves = {
            ArrowUp: [0, -10],
            ArrowDown: [0, 10],
            ArrowLeft: [-10, 0],
            ArrowRight: [10, 0]
        };
        const movement = moves[event.key];
        if (!movement) return;
        event.preventDefault();
        setCrosshairPreviewOffset(
            crosshairPreviewOffset.x + movement[0],
            crosshairPreviewOffset.y + movement[1],
            true
        );
    });

    window.addEventListener('resize', clampCrosshairPreviewPosition);
}


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

    /* Mostra/esconde painel de configuração da crosshair */
    const crosshairPanel = document.getElementById("crosshair-panel");
    if (crosshairPanel) {
        crosshairPanel.style.display = (uiState["crosshair"] === "ON") ? "block" : "none";
    }
}


/* ──────────────────────────────────────────────────────────
   NAVEGAÇÃO
────────────────────────────────────────────────────────── */

function navigate(pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".sidebar__nav-link").forEach(l => l.classList.remove("active"));
    document.querySelectorAll(".organic-menu__item").forEach(l => l.classList.remove("organic-menu__item--active"));

    const page = document.getElementById(`page-${pageId}`);
    if (page) page.classList.add("active");

    const link = document.querySelector(`[data-page="${pageId}"]`);
    if (link) link.classList.add("active");

    // Sincroniza menu orgânico via API global
    window.organicMenuAPI?.setActivePage(pageId);
}

// Inicializa menu orgânico (substitui a sidebar padrão)
// O script organic-menu.js já roda e expõe window.organicMenuAPI
// Chamamos initOrganicMenu se estiver disponível globalmente
if (typeof window.initOrganicMenu === "function") {
    window.initOrganicMenu(navigate);
}

// Fallback: listeners para links antigos da sidebar (se existirem)
document.querySelectorAll(".sidebar__nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page) navigate(page);
    });
});

function formatBytes(bytes) {
    if (bytes === null || bytes === undefined || bytes === "") {
        return "Não disponível: provedor não retornou o dado";
    }
    const value = Number(bytes);
    if (!Number.isFinite(value) || value < 0) return "Não disponível: provedor não retornou o dado";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function diagnosticValue(value, suffix = "") {
    if (value === null || value === undefined || value === "") return "Não disponível: provedor não retornou o dado";
    return `${value}${suffix}`;
}

function makeDiagnosticsCard(title, source, entries) {
    const article = document.createElement("article");
    article.className = "diagnostics-card";
    const heading = document.createElement("h3");
    heading.textContent = title;
    article.appendChild(heading);

    const list = document.createElement("dl");
    entries.forEach(([label, value]) => {
        const row = document.createElement("div");
        row.className = "diagnostics-card__row";
        const term = document.createElement("dt");
        term.textContent = label;
        const description = document.createElement("dd");
        description.textContent = value;
        row.append(term, description);
        list.appendChild(row);
    });
    article.appendChild(list);

    const sourceText = document.createElement("span");
    sourceText.className = "diagnostics-card__source";
    sourceText.textContent = `Fonte: ${source}`;
    article.appendChild(sourceText);
    return article;
}

function renderHardwareDiagnostics(report) {
    const results = document.getElementById("hardware-diagnostics-results");
    const status = document.getElementById("hardware-diagnostics-status");
    const warnings = document.getElementById("hardware-diagnostics-warnings");
    const cards = [];
    const cpu = report.cpu || {};
    cards.push(makeDiagnosticsCard("Processador", "Windows CIM/WMI", [
        ["Modelo", diagnosticValue(cpu.model)],
        ["Núcleos / processadores lógicos", `${diagnosticValue(cpu.cores)} / ${diagnosticValue(cpu.logicalProcessors)}`],
        ["Carga informada pelo Windows", diagnosticValue(cpu.usagePercent, "%")]
    ]));

    const memory = report.memory || {};
    const modules = Array.isArray(memory.modules) ? memory.modules : [];
    const moduleSpeeds = modules.map(module => module.configuredSpeedMHz || module.speedMHz).filter(Boolean);
    cards.push(makeDiagnosticsCard("Memória RAM", "Windows CIM/WMI", [
        ["Instalada", formatBytes(memory.totalBytes)],
        ["Disponível", formatBytes(memory.freeBytes)],
        ["Módulos detectados", modules.length ? String(modules.length) : "Não disponível: CIM/WMI não retornou módulos"],
        ["Velocidade informada", moduleSpeeds.length ? `${moduleSpeeds.join(", ")} MHz` : "Não disponível: CIM/WMI não retornou a velocidade"]
    ]));

    const gpus = Array.isArray(report.gpus) ? report.gpus : [];
    if (gpus.length) {
        gpus.forEach((gpu, index) => {
            const telemetry = gpu.telemetry || {};
            const entries = [
                ["Modelo", diagnosticValue(gpu.name)],
                ["Versão do driver", diagnosticValue(gpu.driverVersion)],
                ["VRAM (CIM/WMI; valor pode ser limitado)", formatBytes(gpu.vramBytes)],
                ["Uso da GPU", diagnosticValue(telemetry.usagePercent, "%")],
                ["Temperatura", diagnosticValue(telemetry.temperatureCelsius, " °C")],
                ["VRAM usada / total (nvidia-smi)", Number.isFinite(telemetry.memoryUsedMiB) && Number.isFinite(telemetry.memoryTotalMiB)
                    ? `${telemetry.memoryUsedMiB} / ${telemetry.memoryTotalMiB} MiB`
                    : "Não disponível: nvidia-smi não retornou os valores"]
            ];
            cards.push(makeDiagnosticsCard(`GPU${gpus.length > 1 ? ` ${index + 1}` : ""}`, "Windows CIM/WMI e nvidia-smi quando disponível", entries));
        });
    } else {
        cards.push(makeDiagnosticsCard("GPU", "Windows CIM/WMI", [["Dispositivo", "Não disponível: CIM/WMI não retornou dispositivos"]]));
    }

    const displays = Array.isArray(report.displays) ? report.displays : [];
    cards.push(makeDiagnosticsCard("Monitores", "Electron screen API", displays.length
        ? displays.map((display, index) => [
            `Monitor ${index + 1}`,
            `${diagnosticValue(display.width)} × ${diagnosticValue(display.height)}, ${diagnosticValue(display.refreshRateHz, " Hz")}, escala ${diagnosticValue(display.scaleFactor, "×")}`
        ])
        : [["Monitores detectados", "Não disponível: Electron não retornou monitores"]]));

    const physicalDisks = Array.isArray(report.physicalDisks) ? report.physicalDisks : [];
    const volumes = Array.isArray(report.volumes) ? report.volumes : [];
    const diskEntries = physicalDisks.map((disk, index) => [
        `Disco físico ${index + 1}`,
        `${disk.model || "Modelo não disponível: provedor não retornou o dado"} — ${formatBytes(disk.capacityBytes)}`
    ]);
    volumes.forEach(volume => {
        diskEntries.push([
            `Espaço em ${volume.deviceId || "volume"}`,
            `${formatBytes(volume.freeBytes)} livres / ${formatBytes(volume.capacityBytes)}`
        ]);
    });
    cards.push(makeDiagnosticsCard("Armazenamento", "Windows CIM/WMI", diskEntries.length
        ? diskEntries
        : [["Discos/volumes", "Não disponível: CIM/WMI não retornou discos ou volumes"]]));

    results.replaceChildren(...cards);
    const capturedAt = new Date(report.capturedAt);
    status.classList.remove("diagnostics-status--error");
    status.textContent = `Consulta concluída em ${Number.isNaN(capturedAt.getTime()) ? "horário não disponível" : capturedAt.toLocaleString()}. Fontes: ${report.source}. Campos indisponíveis não foram estimados.`;

    warnings.replaceChildren();
    (Array.isArray(report.warnings) ? report.warnings : []).forEach(warning => {
        const item = document.createElement("li");
        item.textContent = warning;
        warnings.appendChild(item);
    });
    if (report.nvidiaTelemetry && !report.nvidiaTelemetry.available) {
        const item = document.createElement("li");
        item.textContent = `Telemetria NVIDIA indisponível: ${report.nvidiaTelemetry.reason}`;
        warnings.appendChild(item);
    }
    warnings.hidden = warnings.childElementCount === 0;
}

const diagnosticsButton = document.getElementById("hardware-diagnostics-refresh");
if (diagnosticsButton) {
    diagnosticsButton.addEventListener("click", async () => {
        const status = document.getElementById("hardware-diagnostics-status");
        diagnosticsButton.disabled = true;
        status.classList.remove("diagnostics-status--error");
        status.textContent = "Coletando informações somente leitura…";
        try {
            const report = await window.electronAPI.collectHardwareDiagnostics();
            renderHardwareDiagnostics(report);
        } catch (error) {
            status.classList.add("diagnostics-status--error");
            status.textContent = `Falha ao coletar o diagnóstico: ${error.message}`;
            console.error("Falha no diagnóstico de hardware:", error);
        } finally {
            diagnosticsButton.disabled = false;
        }
    });
}

function renderLiveHardwareSnapshot(snapshot) {
    const results = document.getElementById("hardware-monitor-results");
    const sensorResults = document.getElementById("hardware-monitor-sensors");
    const status = document.getElementById("hardware-monitor-status");
    const warnings = document.getElementById("hardware-monitor-warnings");
    if (snapshot.error) {
        status.classList.add("diagnostics-status--error");
        status.textContent = `Falha na leitura dos sensores: ${snapshot.error}`;
        results.replaceChildren();
        sensorResults.replaceChildren();
        warnings.replaceChildren();
        warnings.hidden = true;
        return;
    }

    const capturedAt = new Date(snapshot.capturedAt);
    status.classList.remove("diagnostics-status--error");
    const sensors = Array.isArray(snapshot.sensors) ? snapshot.sensors : [];
    status.textContent = `Atualizado ${Number.isNaN(capturedAt.getTime()) ? "sem horário disponível" : capturedAt.toLocaleTimeString()} · ${sensors.length} sensores ativos · atualização a cada ${snapshot.intervalMs / 1000}s · Fonte: ${snapshot.source}.`;

    const cpu = snapshot.cpu || {};
    const memory = snapshot.memory || {};
    const cards = [
        makeDiagnosticsCard("Processador", snapshot.cpuSource || snapshot.source, [
            ["Uso", diagnosticValue(cpu.usagePercent, "%")],
            ["Temperatura", cpu.temperatureCelsius === null || cpu.temperatureCelsius === undefined
                ? `Não disponível: ${cpu.temperatureReason || "sensor não informado"}`
                : `${Number(cpu.temperatureCelsius).toFixed(1)} °C`]
        ]),
        makeDiagnosticsCard("Memória RAM", snapshot.memorySource || snapshot.source, [
            ["Uso", diagnosticValue(memory.usagePercent, "%")],
            ["Em uso", formatBytes(memory.usedBytes)],
            ["Disponível", formatBytes(memory.freeBytes)],
            ["Total", formatBytes(memory.totalBytes)]
        ]),
        makeDiagnosticsCard("FPS / frametime", "Provedor de captura de frames", [
            ["FPS", snapshot.fps?.available ? diagnosticValue(snapshot.fps.value) : `Não disponível: ${snapshot.fps?.reason || "provedor não detectado"}`],
            ["Frametime", "Não disponível: requer provedor de captura de frames"]
        ])
    ];

    const gpus = Array.isArray(snapshot.gpus) ? snapshot.gpus : [];
    if (gpus.length) {
        gpus.forEach((gpu, index) => {
            cards.push(makeDiagnosticsCard(`${gpus.length > 1 ? `GPU ${index + 1}` : "GPU"} · ${gpu.name || "modelo não informado"}`, snapshot.gpuSource || snapshot.source, [
                ["Uso", diagnosticValue(gpu.usagePercent, "%")],
                ["Temperatura", gpu.temperatureCelsius === null || gpu.temperatureCelsius === undefined
                    ? "Não disponível: sensor não retornado"
                    : `${Number(gpu.temperatureCelsius).toFixed(1)} °C`],
                ["Memória de vídeo", Number.isFinite(gpu.memoryUsedMiB) && Number.isFinite(gpu.memoryTotalMiB)
                    ? `${gpu.memoryUsedMiB} / ${gpu.memoryTotalMiB} MiB`
                    : "Não disponível: driver não retornou a leitura"],
                ["Ventoinha", diagnosticValue(gpu.fanSpeedPercent, "%")],
                ["Rotação da ventoinha", diagnosticValue(gpu.fanSpeedRpm, " RPM")]
            ]));
        });
    } else {
        cards.push(makeDiagnosticsCard("GPU", snapshot.gpuSource || snapshot.source, [
            ["Sensores", `Não disponível: ${snapshot.gpuSensorsReason || "nenhum sensor compatível retornado"}`]
        ]));
    }
    results.replaceChildren(...cards);

    const groupedSensors = new Map();
    sensors.forEach(sensor => {
        const key = `${sensor.hardwareType}: ${sensor.hardwareName}`;
        if (!groupedSensors.has(key)) groupedSensors.set(key, []);
        const value = Number(sensor.value);
        const invalidTemperature = sensor.sensorType === "Temperature" && (value <= 0 || value >= 150);
        const formattedValue = invalidTemperature
            ? "Não disponível: sensor sem leitura válida"
            : Number.isFinite(value) ? value.toFixed(2).replace(/\.?0+$/, "") : "Não disponível";
        groupedSensors.get(key).push([
            `${sensor.name} (${sensor.sensorType})`,
            invalidTemperature ? formattedValue : `${formattedValue}${sensor.unit ? ` ${sensor.unit}` : ""}`
        ]);
    });
    sensorResults.replaceChildren(...Array.from(groupedSensors, ([title, entries]) =>
        makeDiagnosticsCard(title, snapshot.source, entries)
    ));

    warnings.replaceChildren();
    (Array.isArray(snapshot.warnings) ? snapshot.warnings : []).forEach(warning => {
        const item = document.createElement("li");
        item.textContent = warning;
        warnings.appendChild(item);
    });
    warnings.hidden = warnings.childElementCount === 0;
}

let hardwareMonitorRunning = false;
const hardwareMonitorButton = document.getElementById("hardware-monitor-toggle");
const hardwareMonitorStatus = document.getElementById("hardware-monitor-status");

window.electronAPI?.onHardwareMonitorUpdate?.(renderLiveHardwareSnapshot);

if (hardwareMonitorButton) {
    hardwareMonitorButton.addEventListener("click", async () => {
        hardwareMonitorButton.disabled = true;
        try {
            if (hardwareMonitorRunning) {
                await window.electronAPI.stopHardwareMonitor();
                hardwareMonitorRunning = false;
                hardwareMonitorButton.textContent = "Iniciar monitoramento";
                hardwareMonitorStatus.textContent = "Monitor parado. Os últimos valores permanecem visíveis.";
            } else {
                hardwareMonitorStatus.textContent = "Iniciando leitura dos sensores…";
                await window.electronAPI.startHardwareMonitor();
                hardwareMonitorRunning = true;
                hardwareMonitorButton.textContent = "Parar monitoramento";
            }
        } catch (error) {
            hardwareMonitorStatus.classList.add("diagnostics-status--error");
            hardwareMonitorStatus.textContent = `Falha ao controlar o monitor: ${error.message}`;
            console.error("Falha no monitor de hardware:", error);
        } finally {
            hardwareMonitorButton.disabled = false;
        }
    });
}

let originalNipProfile = null;
let proposedNipProfile = null;

function normalizedXmlName(element) {
    return (element.localName || element.nodeName).replace(/^.*:/, "").toLowerCase();
}

function getXmlField(element, names) {
    const acceptedNames = new Set(names.map(name => name.toLowerCase()));
    const descendants = Array.from(element.getElementsByTagName("*"));
    const field = descendants.find(node => acceptedNames.has(normalizedXmlName(node)));
    return field ? field.textContent.trim() : "";
}

function parseNipProfile(file) {
    if (/<!DOCTYPE|<!ENTITY/i.test(file.content)) {
        throw new Error("O arquivo contém declarações DTD/ENTITY e foi recusado por segurança.");
    }

    const documentXml = new DOMParser().parseFromString(file.content, "application/xml");
    const elements = Array.from(documentXml.getElementsByTagName("*"));
    if (elements.some(element => normalizedXmlName(element) === "parsererror")) {
        throw new Error("O arquivo não contém XML válido.");
    }

    const profileElements = elements.filter(element => normalizedXmlName(element) === "profile");
    if (profileElements.length > 1) {
        throw new Error("O arquivo contém vários perfis. Exporte somente o perfil desejado no NVIDIA Profile Inspector e tente novamente.");
    }
    const profileScope = profileElements[0] || documentXml;
    const profileName = getXmlField(profileScope, ["ProfileName"]);
    const profileElementsForParsing = Array.from(profileScope.getElementsByTagName("*"));
    const executables = [...new Set(profileElementsForParsing
        .filter(element => ["string", "executable", "executeable"].includes(normalizedXmlName(element)))
        .map(element => element.textContent.trim())
        .filter(value => /\.exe$/i.test(value)))];

    const settingElements = profileElementsForParsing
        .filter(element => ["setting", "profilesetting"].includes(normalizedXmlName(element)))
        .filter(element => !Array.from(element.getElementsByTagName("*"))
            .some(child => ["setting", "profilesetting"].includes(normalizedXmlName(child))));
    const settings = [];
    settingElements.forEach(element => {
        const id = getXmlField(element, ["SettingID", "SettingId", "ID"]);
        const name = getXmlField(element, ["SettingNameInfo", "SettingName", "Name"]);
        const value = getXmlField(element, ["SettingValue", "Value", "SettingValueDword", "SettingValueString"]);
        if (!id && !name) return;
        settings.push({
            id: id || "ID não informado",
            name: name || "Nome não informado",
            value: value || "Valor não informado"
        });
    });

    if (!profileName && settings.length === 0) {
        throw new Error("O XML foi lido, mas não contém perfil ou configurações reconhecíveis do NVIDIA Profile Inspector.");
    }
    if (settings.length > 5000) {
        throw new Error("O perfil excede o limite de 5.000 configurações para exibição.");
    }

    const occurrenceCounts = new Map();
    settings.forEach(setting => {
        const baseKey = setting.id !== "ID não informado"
            ? `id:${setting.id.toLowerCase()}`
            : `name:${setting.name.toLowerCase()}`;
        const occurrence = occurrenceCounts.get(baseKey) || 0;
        occurrenceCounts.set(baseKey, occurrence + 1);
        setting.key = `${baseKey}:${occurrence}`;
    });

    return {
        name: file.name,
        profileName: profileName || "Nome do perfil não informado",
        executables,
        settings
    };
}

function setNipProfileSummary(profiles) {
    const summary = document.getElementById("nip-profile-summary");
    const entries = [];
    profiles.forEach(([label, profile]) => {
        if (!profile) return;
        entries.push(`${label}: ${profile.profileName}`);
        entries.push(`${label} — arquivo: ${profile.name}`);
        entries.push(`${label} — executáveis: ${profile.executables.length ? profile.executables.join(", ") : "não informados no arquivo"}`);
        entries.push(`${label} — configurações: ${profile.settings.length}`);
    });
    summary.replaceChildren(...entries.map(text => {
        const item = document.createElement("div");
        item.textContent = text;
        return item;
    }));
    summary.hidden = entries.length === 0;
}

function addNipTableCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.appendChild(cell);
}

function renderNipProfileAnalysis() {
    const body = document.getElementById("nip-profile-settings");
    const tableWrap = document.getElementById("nip-profile-table-wrap");
    const status = document.getElementById("nip-profile-status");
    status.classList.remove("diagnostics-status--error");
    setNipProfileSummary([
        ["Original", originalNipProfile],
        ["Recebido", proposedNipProfile]
    ]);
    body.replaceChildren();
    if (!proposedNipProfile) {
        tableWrap.hidden = true;
        status.textContent = "Selecione uma exportação de um único perfil. Para identificar mudanças, carregue também o original correspondente.";
        return;
    }

    const originalSettings = originalNipProfile
        ? new Map(originalNipProfile.settings.map(setting => [setting.key, setting]))
        : new Map();
    const proposedSettings = new Map(proposedNipProfile.settings.map(setting => [setting.key, setting]));
    const allKeys = [...new Set([...originalSettings.keys(), ...proposedSettings.keys()])];
    const rows = allKeys.map(key => {
        const original = originalSettings.get(key);
        const proposed = proposedSettings.get(key);
        let state;
        let originalValue;
        let proposedValue;
        let explanation;
        if (!originalNipProfile) {
            state = "Proposta — sem comparação";
            originalValue = "Original não selecionado";
            proposedValue = proposed.value;
            explanation = "O arquivo não registra a justificativa da configuração.";
        } else if (!original) {
            state = "Adicionada ao arquivo recebido";
            originalValue = "Não encontrada no XML original";
            proposedValue = proposed.value;
            explanation = "Presença no arquivo não comprova aplicação ou efeito no driver.";
        } else if (!proposed) {
            state = "Ausente no arquivo recebido";
            originalValue = original.value;
            proposedValue = "Não consta no XML recebido";
            explanation = "Ausência no arquivo não significa que a opção foi desativada no driver.";
        } else if (original.value !== proposed.value) {
            state = "Valor diferente";
            originalValue = original.value;
            proposedValue = proposed.value;
            explanation = "O XML não informa o motivo da mudança nem confirma seu efeito.";
        } else {
            state = "Sem diferença no XML";
            originalValue = original.value;
            proposedValue = proposed.value;
            explanation = "Valores iguais no arquivo; isso não verifica o estado atual do driver.";
        }
        const setting = proposed || original;
        return {
            key,
            name: `${setting.name} (${setting.id})`,
            originalValue,
            proposedValue,
            state,
            explanation,
            changed: state === "Valor diferente",
            added: state === "Adicionada ao arquivo recebido" || state === "Ausente no arquivo recebido"
        };
    });

    rows.sort((first, second) =>
        Number(second.changed || second.added) - Number(first.changed || first.added)
        || first.name.localeCompare(second.name)
    );

    rows.forEach(result => {
        const row = document.createElement("tr");
        if (result.changed) row.className = "nip-profile-table__changed";
        else if (result.added) row.className = "nip-profile-table__added";
        addNipTableCell(row, result.name);
        addNipTableCell(row, result.originalValue);
        addNipTableCell(row, result.proposedValue);
        addNipTableCell(row, result.state + ". " + result.explanation);
        body.appendChild(row);
    });
    if (rows.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.className = "nip-profile-table__empty";
        cell.colSpan = 4;
        cell.textContent = "Nenhuma configuração reconhecível foi encontrada nos arquivos selecionados.";
        row.appendChild(cell);
        body.appendChild(row);
    }
    tableWrap.hidden = false;

    const mismatch = originalNipProfile
        && originalNipProfile.profileName !== proposedNipProfile.profileName;
    const diffCount = rows.filter(row => row.changed || row.added).length;
    status.textContent = originalNipProfile
        ? `${diffCount} diferença(s) encontrada(s) entre os XMLs.${mismatch ? " Atenção: os nomes dos perfis não coincidem." : ""} A comparação não verifica configurações efetivamente aplicadas.`
        : `Perfil carregado com ${proposedNipProfile.settings.length} configuração(ões). Selecione também o arquivo original para identificar diferenças. Nenhuma justificativa é presumida.`;
}

async function openNipProfile(buttonId, fileLabelId, target) {
    const button = document.getElementById(buttonId);
    const status = document.getElementById("nip-profile-status");
    button.disabled = true;
    try {
        if (!window.electronAPI?.openNipProfile) {
            throw new Error("A seleção segura de arquivos não está disponível nesta execução.");
        }
        const file = await window.electronAPI.openNipProfile();
        if (file.canceled) return;
        const profile = parseNipProfile(file);
        if (target === "original") originalNipProfile = profile;
        else proposedNipProfile = profile;
        document.getElementById(fileLabelId).textContent = file.name;
        renderNipProfileAnalysis();
    } catch (error) {
        status.classList.add("diagnostics-status--error");
        status.textContent = `Falha ao analisar o perfil: ${error.message}`;
        console.error("Falha ao analisar perfil NVIDIA:", error);
    } finally {
        button.disabled = false;
    }
}

document.getElementById("nip-profile-original")?.addEventListener("click", () => {
    openNipProfile("nip-profile-original", "nip-profile-original-name", "original");
});

document.getElementById("nip-profile-proposed")?.addEventListener("click", () => {
    openNipProfile("nip-profile-proposed", "nip-profile-proposed-name", "proposed");
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
   LISTENER — overlay fechada pelo botão X
   Atualiza o toggle para OFF sem precisar clicar no Control Center
────────────────────────────────────────────────────────── */
window.electronAPI?.onModuleClosed?.((id) => {
    if (uiState[id] === undefined) return;
    uiState[id] = "OFF";
    delete uiState[`${id}__error`];
    refreshCard(id);
    updateDashboard();
});




renderAll();
initCrosshairPanel();
