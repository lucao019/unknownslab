/* =========================================================
   SERVICE — pubg-stats-overlay
   Único módulo marcado como implemented: true nesta fase.
   Apenas verifica se o servidor local está acessível.
   Não inicia nem para o servidor Express — ele é externo.
========================================================= */

const SERVER_URL = "http://localhost:5051/api/hoje";
const POLL_MS = 60_000;

let pollInterval = null;
let lastStatus = null;

const service = {

    async start() {
        /* Verifica se o servidor está online */
        await this._ping();

        /* Polling para manter status atualizado */
        pollInterval = setInterval(() => {
            this._ping().catch(() => {
                /* Falhas silenciosas no poll — o módulo permanece ON */
            });
        }, POLL_MS);
    },

    async stop() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
        lastStatus = null;
    },

    getStatus() {
        return lastStatus;
    },

    async _ping() {
        const res = await fetch(SERVER_URL);
        if (!res.ok) {
            throw new Error(`Servidor PUBG Stats retornou HTTP ${res.status}`);
        }
        lastStatus = await res.json();
        return lastStatus;
    }

};

module.exports = service;
