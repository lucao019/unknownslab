/* =========================================================
   OVERLAY CONTROLS — script compartilhado
========================================================= */

(function () {

    const wrap     = document.querySelector(".overlay-wrap");
    const pip      = document.querySelector(".overlay-pip");
    const dragBtn  = document.querySelector("[data-action='drag']");
    const hideBtn  = document.querySelector("[data-action='hide']");
    const closeBtn = document.querySelector("[data-action='close']");

    /* ── GUARD: ignora cliques logo após a janela ganhar foco ──
       Evita cliques fantasmas quando o mouse entra/sai rápido */
    let windowFocusedAt = Date.now();
    window.addEventListener("focus", () => { windowFocusedAt = Date.now(); });
    window.addEventListener("mouseenter", () => { windowFocusedAt = Date.now(); });

    function isSafeClick() {
        /* Ignora cliques nos primeiros 300ms após o mouse entrar */
        return (Date.now() - windowFocusedAt) > 300;
    }

    /* ── HIDE / SHOW ── */
    function hide() {
        wrap.classList.add("is-hidden");
    }

    function show() {
        wrap.classList.remove("is-hidden");
    }

    if (hideBtn) {
        hideBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!isSafeClick()) return;
            hide();
        });
    }

    if (pip) pip.addEventListener("click", show);

    /* ── FECHAR ── */
    if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            /* Guard duplo: precisa de clique intencional */
            if (!isSafeClick()) return;
            window.overlayAPI?.closeOverlay?.();
        });

        /* Confirma visualmente que o X foi registrado — evita duplo clique */
        closeBtn.addEventListener("mousedown", (e) => e.stopPropagation());
    }

    /* ── DRAG — usa -webkit-app-region: drag no CSS ── */
    if (dragBtn) {
        dragBtn.addEventListener("click", (e) => e.stopPropagation());
    }

    /* ── BLOQUEIA cliques que chegam de fora da barra ──
       Quando o mouse passa rápido sobre a janela transparente,
       eventos podem vazar pro body. Ignoramos mousedown fora dos botões. */
    document.body.addEventListener("mousedown", (e) => {
        const isInteractive = e.target.closest(".obar-btn, .overlay-pip, .overlay-bar");
        if (!isInteractive) e.stopPropagation();
    }, true);

})();
