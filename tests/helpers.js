// Shared stubs for component tests: no DOM required.

export function makeApp() {
    const listeners = {};
    const events = [];
    return {
        data: null,
        partial: null,
        fileName: "",
        events,
        on(event, cb) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(cb);
        },
        emit(event, payload) {
            events.push({ event, payload });
            (listeners[event] || []).forEach(cb => cb(payload));
        },
        setData(data, partial = null) {
            this.data = data;
            this.partial = partial;
        },
        setFileName(name) {
            this.fileName = name;
        },
        eventsOf(name) {
            return events.filter(e => e.event === name);
        }
    };
}

export function makeFile(name, text) {
    return { name, text: async () => text };
}
