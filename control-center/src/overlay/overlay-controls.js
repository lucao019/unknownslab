/* =========================================================
   OVERLAY CONTROLS — script compartilhado
   Gerencia hide/show, drag e fechar para qualquer overlay.
   Inclua DEPOIS do conteúdo específico de cada overlay.

   Requer no HTML:
     .overlay-wrap       — wrapper externo
     .overlay-content    — o conteúdo visível
     .overlay-pip        — ponto de restore
     .overlay-bar        — barra de controles
     [data-action="drag"]   — alça de arrasto
     [data-action="hide"]   — botão hide
     [data-action="close"]  — botão fechar
========================================================= */

(function () {

    const wrap    = document.querySelector(".overlay-wrap");
    const pip     = document.querySelector(".overlay-pip");
    const dragBtn = document.querySelector("[data-action='drag']");
    const hideBtn = document.querySelector("[data-action='hide']");
    const closeBtn = document.querySelector("[data-action='close']");

    /* ── HIDE / SHOW ── */

    function hide() {
        wrap.classList.add("is-hidden");
    }

    function show() {
        wrap.classList.remove("is-hidden");
    }

    if (hideBtn) hideBtn.addEventListener("click", hide);
    if (pip)     pip.addEventListener("click", show);


    /* ── FECHAR — avisa o main process ── */

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            window.overlayAPI?.closeOverlay?.();
        });
    }


    /* ── DRAG — mover a janela pelo botão de drag ── */

    if (dragBtn) {
        let dragging = false;
        let startX = 0, startY = 0;

        dragBtn.addEventListener("mousedown", (e) => {
            dragging = true;
            startX = e.screenX;
            startY = e.screenY;
            e.preventDefault();
        });

        document.addEventListener("mousemove", (e) => {
            if (!dragging) return;
            const dx = e.screenX - startX;
            const dy = e.screenY - startY;
            startX = e.screenX;
            startY = e.screenY;
            window.overlayAPI?.moveWindow?.(dx, dy);
        });

        document.addEventListener("mouseup", () => {
            dragging = false;
        });
    }

})();
