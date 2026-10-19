/* =========================================================
   KEYBOARD OVERLAY — renderer
   Recebe eventos do processo main via contextBridge
   e atualiza o visual das teclas.
========================================================= */

/* Tempo em ms que a tecla fica em "releasing" após keyup */
const RELEASE_FADE_MS = 120;

/* Map: label → elemento DOM */
const keyEls = new Map();
document.querySelectorAll("[data-key]").forEach(el => {
    keyEls.set(el.dataset.key, el);
});

/* Timers de release por tecla */
const releaseTimers = new Map();

function pressKey(label) {
    const el = keyEls.get(label);
    if (!el) return;

    /* Cancela timer de release se a tecla for pressionada de novo */
    if (releaseTimers.has(label)) {
        clearTimeout(releaseTimers.get(label));
        releaseTimers.delete(label);
    }

    el.classList.remove("releasing");
    el.classList.add("active");
}

function releaseKey(label) {
    const el = keyEls.get(label);
    if (!el) return;

    el.classList.remove("active");
    el.classList.add("releasing");

    const timer = setTimeout(() => {
        el.classList.remove("releasing");
        releaseTimers.delete(label);
    }, RELEASE_FADE_MS);

    releaseTimers.set(label, timer);
}

function clearAll() {
    keyEls.forEach((el, label) => {
        if (releaseTimers.has(label)) {
            clearTimeout(releaseTimers.get(label));
            releaseTimers.delete(label);
        }
        el.classList.remove("active", "releasing");
    });
}

/* Recebe eventos do main via preload */
window.overlayAPI?.onKeyEvent((event) => {
    if (event.type === "keydown") pressKey(event.label);
    else if (event.type === "keyup") releaseKey(event.label);
    else if (event.type === "clear") clearAll();
});
