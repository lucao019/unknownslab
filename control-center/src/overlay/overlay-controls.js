/* =========================================================
   OVERLAY CONTROLS
   Controles de UI para overlays (keyboard/mouse):
   - drag via PIP / botão mover
   - hide/show
   - close
   - resize transparente (edges + corners) com pointer events
========================================================= */

/**
 * @typedef {Object} ResizeEdge
 * @property {string} edge - Identificador da borda/canto (ex: "top", "bottom-right")
 * @property {number} x - Direção horizontal (-1, 0, 1)
 * @property {number} y - Direção vertical (-1, 0, 1)
 * @property {string} cursor - CSS cursor para o handle
 */

/**
 * @typedef {Object} ResizeStartState
 * @property {number} x - screenX inicial
 * @property {number} y - screenY inicial
 * @property {number} width - innerWidth inicial
 * @property {number} height - innerHeight inicial
 * @property {number} directionX - direção horizontal do handle
 * @property {number} directionY - direção vertical do handle
 */

/**
 * @typedef {Object} OverlayAPI
 * @property {(dx: number, dy: number) => void} moveWindow
 * @property {(width: number, height: number, edge: string) => void} resizeWindow
 * @property {() => void} closeOverlay
 * @property {(cb: (event: {type: string, label: string, keycode: number, ts: number}) => void) => void} onKeyEvent
 * @property {(cb: (event: {type: string, button: number, x: number, y: number, ts: number}) => void) => void} onMouseEvent
 */

(function () {

    /** @type {HTMLElement|null} */
    const wrap     = document.querySelector(".overlay-wrap");
    /** @type {HTMLElement|null} */
    const pip      = document.querySelector(".overlay-pip");
    /** @type {HTMLElement|null} */
    const dragBtn  = document.querySelector("[data-action='drag']");
    /** @type {HTMLElement|null} */
    const hideBtn  = document.querySelector("[data-action='hide']");
    /** @type {HTMLElement|null} */
    const closeBtn = document.querySelector("[data-action='close']");

    /* ── GUARD ── */
    let enteredAt = Date.now();
    window.addEventListener("mouseenter", () => { enteredAt = Date.now(); });
    function isSafeClick() { return (Date.now() - enteredAt) > 200; }

    /* ── HIDE / SHOW ── */
    function hide() { wrap.classList.add("is-hidden"); }
    function show() { wrap.classList.remove("is-hidden"); }

    if (hideBtn) {
        hideBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!isSafeClick()) return;
            hide();
        });
    }

    /* ── PIP — drag move, clique parado restaura ── */
    if (pip) {
        let dragging  = false;
        let dragMoved = false;
        let startX    = 0;
        let startY    = 0;

        pip.addEventListener("mousedown", (e) => {
            dragging  = true;
            dragMoved = false;
            startX    = e.screenX;
            startY    = e.screenY;
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener("mousemove", (e) => {
            if (!dragging) return;
            const dx = e.screenX - startX;
            const dy = e.screenY - startY;
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true;
            if (dragMoved) {
                startX = e.screenX;
                startY = e.screenY;
                window.overlayAPI?.moveWindow?.(dx, dy);
            }
        });

        document.addEventListener("mouseup", () => {
            const wasDrag = dragMoved;
            dragging  = false;
            dragMoved = false;
            if (!wasDrag) show();
        });
    }

    /* ── FECHAR ── */
    if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!isSafeClick()) return;
            window.overlayAPI?.closeOverlay?.();
        });
        closeBtn.addEventListener("mousedown", (e) => e.stopPropagation());
    }

    /* ── DRAG do botão de mover — via mousemove igual ao pip ── */
    if (dragBtn) {
        let dragging  = false;
        let dragMoved = false;
        let startX    = 0;
        let startY    = 0;

        dragBtn.addEventListener("mousedown", (e) => {
            dragging  = true;
            dragMoved = false;
            startX    = e.screenX;
            startY    = e.screenY;
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener("mousemove", (e) => {
            if (!dragging) return;
            const dx = e.screenX - startX;
            const dy = e.screenY - startY;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved = true;
            if (dragMoved) {
                startX = e.screenX;
                startY = e.screenY;
                window.overlayAPI?.moveWindow?.(dx, dy);
            }
        });

        document.addEventListener("mouseup", () => {
            dragging  = false;
            dragMoved = false;
        });

        dragBtn.addEventListener("click", (e) => e.stopPropagation());
    }

    /** @type {number} */
    const baseWidth = Number(document.body.dataset.baseWidth);
    /** @type {number} */
    const baseHeight = Number(document.body.dataset.baseHeight);
    /** @type {ResizeEdge[]} */
    const resizeEdges = [
        { edge: "top", x: 0, y: -1, cursor: "ns-resize" },
        { edge: "right", x: 1, y: 0, cursor: "ew-resize" },
        { edge: "bottom", x: 0, y: 1, cursor: "ns-resize" },
        { edge: "left", x: -1, y: 0, cursor: "ew-resize" },
        { edge: "top-left", x: -1, y: -1, cursor: "nwse-resize" },
        { edge: "top-right", x: 1, y: -1, cursor: "nesw-resize" },
        { edge: "bottom-right", x: 1, y: 1, cursor: "nwse-resize" },
        { edge: "bottom-left", x: -1, y: 1, cursor: "nesw-resize" }
    ];
    /** @type {ResizeStartState|null} */
    let resizeStart = null;

    /**
     * Atualiza a variável CSS --overlay-scale baseada no tamanho atual da janela
     */
    function updateScale() {
        const scale = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight);
        document.documentElement.style.setProperty("--overlay-scale", String(scale));
    }

    window.addEventListener("resize", updateScale);
    updateScale();

    resizeEdges.forEach((/** @type {ResizeEdge} */ { edge, x, y, cursor }) => {
        /** @type {HTMLDivElement} */
        const handle = document.createElement("div");
        handle.className = `overlay-resize-handle overlay-resize-handle--${edge}`;
        handle.setAttribute("aria-hidden", "true");
        handle.style.cursor = cursor;
        document.body.appendChild(handle);

        handle.addEventListener("pointerdown", (/** @type {PointerEvent} */ e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            resizeStart = {
                x: e.screenX,
                y: e.screenY,
                width: window.innerWidth,
                height: window.innerHeight,
                directionX: x,
                directionY: y
            };
            wrap?.classList.add("is-resizing");
            handle.setPointerCapture(e.pointerId);
        });

        handle.addEventListener("pointermove", (/** @type {PointerEvent} */ e) => {
            if (!resizeStart) return;
            const widthScale = (resizeStart.width +
                (e.screenX - resizeStart.x) * resizeStart.directionX) / baseWidth;
            const heightScale = (resizeStart.height +
                (e.screenY - resizeStart.y) * resizeStart.directionY) / baseHeight;
            /** @type {number[]} */
            const activeScales = [];
            if (resizeStart.directionX) activeScales.push(widthScale);
            if (resizeStart.directionY) activeScales.push(heightScale);
            const scale = Math.max(0.5, Math.min(2.5,
                activeScales.reduce((sum, value) => sum + value, 0) / activeScales.length
            ));
            window.overlayAPI?.resizeWindow?.(
                Math.round(baseWidth * scale),
                Math.round(baseHeight * scale),
                edge
            );
        });

        /**
         * @param {PointerEvent} e
         */
        function stopResize(e) {
            if (!resizeStart) return;
            resizeStart = null;
            wrap?.classList.remove("is-resizing");
            if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
        }

        handle.addEventListener("pointerup", stopResize);
        handle.addEventListener("pointercancel", stopResize);
    });

})();
