const { uIOhook } = require("uiohook-napi");

const owners = new Map();

function start(owner, listeners) {
    if (owners.has(owner)) return;

    const registeredListeners = Object.entries(listeners);
    for (const [event, listener] of registeredListeners) {
        uIOhook.on(event, listener);
    }

    if (owners.size === 0) {
        try {
            uIOhook.start();
        } catch (error) {
            for (const [event, listener] of registeredListeners) {
                uIOhook.removeListener(event, listener);
            }
            throw error;
        }
    }

    owners.set(owner, registeredListeners);
}

function stop(owner) {
    const registeredListeners = owners.get(owner);
    if (!registeredListeners) return;

    for (const [event, listener] of registeredListeners) {
        uIOhook.removeListener(event, listener);
    }
    owners.delete(owner);

    if (owners.size === 0) {
        uIOhook.stop();
    }
}

module.exports = { start, stop };
