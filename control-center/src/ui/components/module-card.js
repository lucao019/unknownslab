/* =========================================================
   COMPONENTE — ModuleCard
   Gera o HTML de um card de módulo a partir da definição
   do registry + estado atual do ModuleManager.
   Sem dependência de framework — DOM puro.
========================================================= */

/* Mapa de ícones SVG inline (subconjunto do Lucide) */
const ICONS = {
    "keyboard": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5"/><path d="M12 7V5"/><path d="M16 7V5"/><path d="M6 11h.01"/><path d="M10 11h.01"/><path d="M14 11h.01"/><path d="M18 11h.01"/><path d="M8 15h8"/></svg>`,
    "mouse-pointer-2": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 4 7.07 17 2.51-7.39L21 11.07z"/></svg>`,
    "history": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`,
    "bar-chart-2": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    "move": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>`,
    "arrow-left-right": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>`,
    "zap": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    "chevrons-up": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>`,
    "circle-dot": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
    "activity": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    "timer": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="2" x2="14" y2="2"/><path d="M12 14v-4"/><path d="M4 13a8 8 0 1 0 8-7 8 8 0 0 0-8 7"/><line x1="12" y1="2" x2="12" y2="4"/></svg>`,
    "radio": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M7.76 7.76a6 6 0 0 0 0 8.49"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/></svg>`,
    "presentation": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/></svg>`,
    "settings": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
};

const STATE_LABELS = {
    "OFF":         "Desativado",
    "ON":          "Ativo",
    "STARTING":    "Iniciando…",
    "STOPPING":    "Parando…",
    "ERROR":       "Erro",
    "UNAVAILABLE": "Indisponível"
};

/**
 * Cria o elemento DOM de um module card.
 *
 * @param {import('../../registry/modules').ModuleDefinition} def
 * @param {string} state  - Estado atual do módulo.
 * @param {string|null} errorMsg - Mensagem de erro, se houver.
 * @param {Function} onToggle - Callback ao clicar no toggle.
 * @returns {HTMLElement}
 */
function createModuleCard(def, state, errorMsg, onToggle) {

    const isUnavailable = state === "UNAVAILABLE";
    const isOn          = state === "ON";
    const isError       = state === "ERROR";
    const isBusy        = state === "STARTING" || state === "STOPPING";

    const stateClass = `module-card--${state.toLowerCase()}`;

    const el = document.createElement("div");
    el.className = `module-card ${stateClass}`;
    el.dataset.moduleId = def.id;

    /* Ícone */
    const iconSvg = ICONS[def.icon] ?? ICONS["settings"];

    /* Toggle disabled quando indisponível ou em transição */
    const toggleDisabled = isUnavailable || isBusy;

    el.innerHTML = `
        <div class="module-card__header">
            <div class="module-card__icon-wrap">
                ${iconSvg}
            </div>
            <div class="module-card__info">
                <p class="module-card__name">${escHtml(def.name)}</p>
                <p class="module-card__desc">${escHtml(def.desc)}</p>
            </div>
        </div>

        <div class="module-card__actions">
            <div class="module-card__status">
                <span class="module-card__status-dot"></span>
                <span class="module-card__status-text">${STATE_LABELS[state] ?? state}</span>
            </div>
            <div class="module-card__btn-group">
                <label class="toggle ${toggleDisabled ? "toggle--disabled" : ""}"
                       title="${isUnavailable ? "Módulo não implementado nesta versão" : ""}">
                    <input
                        type="checkbox"
                        ${isOn ? "checked" : ""}
                        ${toggleDisabled ? "disabled" : ""}
                        data-module-toggle="${escHtml(def.id)}"
                    >
                    <span class="toggle__track"></span>
                    <span class="toggle__thumb"></span>
                </label>
            </div>
        </div>

        <p class="module-card__error-msg">${escHtml(errorMsg ?? "")}</p>
    `;

    /* Evento de toggle */
    const input = el.querySelector(`[data-module-toggle]`);
    if (input && !toggleDisabled) {
        input.addEventListener("change", (e) => {
            e.preventDefault(); // a UI não muda sozinha — espera o manager
            onToggle(def.id);
        });
    }

    return el;
}

/**
 * Atualiza um card existente no DOM sem recriá-lo.
 *
 * @param {HTMLElement} el
 * @param {string} state
 * @param {string|null} errorMsg
 */
function updateModuleCard(el, state, errorMsg) {

    const stateClasses = [
        "module-card--off", "module-card--on", "module-card--starting",
        "module-card--stopping", "module-card--error", "module-card--unavailable"
    ];

    stateClasses.forEach(c => el.classList.remove(c));
    el.classList.add(`module-card--${state.toLowerCase()}`);

    const statusText = el.querySelector(".module-card__status-text");
    if (statusText) statusText.textContent = STATE_LABELS[state] ?? state;

    const errorEl = el.querySelector(".module-card__error-msg");
    if (errorEl) errorEl.textContent = errorMsg ?? "";

    const toggle = el.querySelector("[data-module-toggle]");
    if (toggle) {
        toggle.checked  = state === "ON";
        toggle.disabled = state === "UNAVAILABLE" || state === "STARTING" || state === "STOPPING";
    }
}

/* Escapa entidades HTML */
function escHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

window.ModuleCard = { createModuleCard, updateModuleCard };
