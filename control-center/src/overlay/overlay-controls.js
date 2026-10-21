/* =========================================================
   OVERLAY CONTROLS
========================================================= */

(function () {

    const wrap     = document.querySelector(".overlay-wrap");
    const pip      = document.querySelector(".overlay-pip");
    const dragBtn  = document.querySelector("[data-action='drag']");
    const hideBtn  = document.querySelector("[data-action='hide']");
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

    const baseWidth = Number(document.body.dataset.baseWidth);
    const baseHeight = Number(document.body.dataset.baseHeight);
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
    let resizeStart = null;

    function updateScale() {
        const scale = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight);
        document.documentElement.style.setProperty("--overlay-scale", String(scale));
    }

    window.addEventListener("resize", updateScale);
    updateScale();

    resizeEdges.forEach(({ edge, x, y, cursor }) => {
        const handle = document.createElement("div");
        handle.className = `overlay-resize-handle overlay-resize-handle--${edge}`;
        handle.setAttribute("aria-hidden", "true");
        handle.style.cursor = cursor;
        document.body.appendChild(handle);

        handle.addEventListener("pointerdown", (e) => {
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
            wrap.classList.add("is-resizing");
            handle.setPointerCapture(e.pointerId);
        });

        handle.addEventListener("pointermove", (e) => {
            if (!resizeStart) return;
            const widthScale = (resizeStart.width +
                (e.screenX - resizeStart.x) * resizeStart.directionX) / baseWidth;
            const heightScale = (resizeStart.height +
                (e.screenY - resizeStart.y) * resizeStart.directionY) / baseHeight;
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

        function stopResize(e) {
            if (!resizeStart) return;
            resizeStart = null;
            wrap.classList.remove("is-resizing");
            if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
        }

        handle.addEventListener("pointerup", stopResize);
        handle.addEventListener("pointercancel", stopResize);
    });

})();
