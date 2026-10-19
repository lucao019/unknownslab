/* =========================================================
   OVERLAY CONTROLS — script compartilhado
========================================================= */

(function () {

    const wrap     = document.querySelector(".overlay-wrap");
    const pip      = document.querySelector(".overlay-pip");
    const dragBtn  = document.querySelector("[data-action='drag']");
    const hideBtn  = document.querySelector("[data-action='hide']");
    const closeBtn = document.querySelector("[data-action='close']");

    /* ── GUARD: ignora cliques logo após o mouse entrar ── */
    let windowFocusedAt = Date.now();
    window.addEventListener("focus",      () => { windowFocusedAt = Date.now(); });
    window.addEventListener("mouseenter", () => { windowFocusedAt = Date.now(); });

    function isSafeClick() {
        return (Date.now() - windowFocusedAt) > 300;
    }

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

    /* ── PIP — drag move a janela, clique SEM movimento restaura ── */
    if (pip) {

        let pipDragging  = false;
        let pipDragMoved = false;
        let pipStartX    = 0;
        let pipStartY    = 0;

        pip.addEventListener("mousedown", (e) => {
            pipDragging  = true;
            pipDragMoved = false;
            pipStartX    = e.screenX;
            pipStartY    = e.screenY;
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener("mousemove", (e) => {
            if (!pipDragging) return;
            const dx = e.screenX - pipStartX;
            const dy = e.screenY - pipStartY;

            /* Só conta como drag se moveu mais de 4px */
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
                pipDragMoved = true;
            }

            if (pipDragMoved) {
                pipStartX = e.screenX;
                pipStartY = e.screenY;
                window.overlayAPI?.moveWindow?.(dx, dy);
            }
        });

        document.addEventListener("mouseup", () => {
            const wasDrag = pipDragMoved;
            pipDragging  = false;
            pipDragMoved = false;

            /* Só restaura se NÃO foi drag */
            if (!wasDrag) {
                show();
            }
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

    /* ── DRAG da barra — usa -webkit-app-region no CSS ── */
    if (dragBtn) {
        dragBtn.addEventListener("click", (e) => e.stopPropagation());
    }

    /* ── Bloqueia cliques fantasmas fora de elementos interativos ── */
    document.body.addEventListener("mousedown", (e) => {
        const isInteractive = e.target.closest(".obar-btn, .overlay-pip, .overlay-bar");
        if (!isInteractive) e.stopPropagation();
    }, true);

})();
