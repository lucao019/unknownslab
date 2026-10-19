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

    /* ── DRAG da barra ── */
    if (dragBtn) {
        dragBtn.addEventListener("click", (e) => e.stopPropagation());
    }

})();
