/* =========================================================
   MODULE MANAGER
   Controla o ciclo de vida de cada módulo.
   Estados: OFF | STARTING | ON | STOPPING | ERROR | UNAVAILABLE
   Emite eventos para que a UI sincronize com o estado real.
========================================================= */

const { MODULE_MAP } = require("../registry/modules.js");

/**
 * @typedef {'OFF'|'STARTING'|'ON'|'STOPPING'|'ERROR'|'UNAVAILABLE'} ModuleState
 */

class ModuleManager extends EventTarget {

    constructor() {
        super();

        /** @type {Map<string, ModuleState>} */
        this._states = new Map();

        /** @type {Map<string, string>} */
        this._errors = new Map();

        /** @type {Map<string, object>} */
        this._services = new Map();

        /* Inicializa todos os módulos como OFF ou UNAVAILABLE */
        for (const [id, def] of MODULE_MAP) {
            this._states.set(
                id,
                def.implemented ? "OFF" : "UNAVAILABLE"
            );
        }
    }


    /* ---------------------------------------------------------
       LEITURA DE ESTADO
    --------------------------------------------------------- */

    getState(id) {
        return this._states.get(id) ?? "UNAVAILABLE";
    }

    getError(id) {
        return this._errors.get(id) ?? null;
    }

    getAllStates() {
        return Object.fromEntries(this._states);
    }

    getActiveCount() {
        let count = 0;
        for (const state of this._states.values()) {
            if (state === "ON") count++;
        }
        return count;
    }

    getErrorCount() {
        let count = 0;
        for (const state of this._states.values()) {
            if (state === "ERROR") count++;
        }
        return count;
    }


    /* ---------------------------------------------------------
       ATIVAR MÓDULO
    --------------------------------------------------------- */

    async start(id) {
        const def = MODULE_MAP.get(id);
        if (!def) throw new Error(`Módulo desconhecido: ${id}`);

        const current = this._states.get(id);

        if (current === "UNAVAILABLE") {
            throw new Error(`Módulo ${id} não está disponível nesta versão.`);
        }

        if (current === "ON" || current === "STARTING") {
            return; // já ativo ou iniciando — noop
        }

        /* Verificar dependências */
        for (const depId of def.dependencies) {
            const depState = this._states.get(depId);
            if (depState !== "ON") {
                throw new Error(
                    `Dependência '${depId}' precisa estar ativa primeiro.`
                );
            }
        }

        this._setState(id, "STARTING");

        try {
            const service = await this._loadService(id);
            await service.start();
            this._services.set(id, service);
            this._errors.delete(id);
            this._setState(id, "ON");

        } catch (err) {
            this._errors.set(id, err.message);
            this._setState(id, "ERROR");
            throw err;
        }
    }


    /* ---------------------------------------------------------
       DESATIVAR MÓDULO
    --------------------------------------------------------- */

    async stop(id) {
        const current = this._states.get(id);

        if (current !== "ON" && current !== "ERROR") {
            return; // nada a parar
        }

        this._setState(id, "STOPPING");

        try {
            const service = this._services.get(id);
            if (service?.stop) {
                await service.stop();
            }
            this._services.delete(id);
            this._errors.delete(id);
            this._setState(id, "OFF");

        } catch (err) {
            /* Falha ao parar — registra erro mas marca como OFF
               para não deixar o módulo preso */
            this._errors.set(id, `Erro ao parar: ${err.message}`);
            this._services.delete(id);
            this._setState(id, "OFF");
        }
    }


    /* ---------------------------------------------------------
       ALTERNAR (toggle)
    --------------------------------------------------------- */

    async toggle(id) {
        const state = this._states.get(id);
        if (state === "ON") {
            await this.stop(id);
        } else if (state === "OFF" || state === "ERROR") {
            await this.start(id);
        }
        // STARTING / STOPPING / UNAVAILABLE — ignora
    }


    /* ---------------------------------------------------------
       DESLIGAR TODOS
    --------------------------------------------------------- */

    async stopAll() {
        const active = [...this._states.entries()]
            .filter(([, state]) => state === "ON")
            .map(([id]) => id);

        await Promise.allSettled(
            active.map(id => this.stop(id))
        );
    }


    /* ---------------------------------------------------------
       CARREGAR SERVICE (lazy)
    --------------------------------------------------------- */

    async _loadService(id) {
        try {
            /* Cada serviço fica em src/services/<id>.js
               e exporta { start(), stop(), getStatus() } */
            const service = require(`../services/${id}.js`);
            return service;
        } catch {
            throw new Error(
                `Serviço '${id}' ainda não implementado.`
            );
        }
    }


    /* ---------------------------------------------------------
       EMITIR EVENTO DE ESTADO
    --------------------------------------------------------- */

    _setState(id, state) {
        this._states.set(id, state);
        this.dispatchEvent(
            new CustomEvent("state-change", {
                detail: { id, state }
            })
        );
    }

}

/* Singleton — uma instância compartilhada */
const moduleManager = new ModuleManager();
module.exports = moduleManager;
