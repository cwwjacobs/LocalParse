// Minimal DOM/event fixture for component wiring, not a replacement for browser QA.
const decodeEntities = text => text.replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) => ({
    amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'"
})[entity]);

export class FakeElement {
    constructor() {
        this.innerHTML = '';
        this.textContent = '';
        this.value = '';
        this.files = [];
        this.style = {};
        this.dataset = {};
        this.listeners = new Map();
    }

    addEventListener(event, callback) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push(callback);
    }

    dispatch(event, properties = {}) {
        for (const callback of this.listeners.get(event) || []) {
            callback({ target: this, currentTarget: this, ...properties });
        }
    }

    click() {
        this.dispatch('click');
    }

    querySelectorAll(selector) {
        if (selector !== '.json-expand[data-path]') throw new Error(`Unexpected selector: ${selector}`);
        // Preserve the same element/listener instances until the HTML changes.
        if (this.parsedHTML !== this.innerHTML) {
            this.parsedHTML = this.innerHTML;
            this.expanders = [...this.innerHTML.matchAll(/<span class="json-expand"([^>]*)>/g)]
                .flatMap(([, attributes]) => {
                    const match = attributes.match(/\bdata-path="([^"]*)"/);
                    if (!match) return [];
                    const element = new FakeElement();
                    element.dataset.path = decodeEntities(match[1]);
                    return [element];
                });
        }
        return this.expanders;
    }
}

export function createDocument() {
    const ids = [
        'navbar', 'file-name', 'nav-load', 'nav-export-json', 'nav-export-jsonl', 'nav-clear',
        'file-input', 'load-btn', 'sidebar', 'viewer'
    ];
    const elements = new Map(ids.map(id => [id, new FakeElement()]));
    return {
        getElementById: id => elements.get(id) || null,
        createElement: () => new FakeElement()
    };
}
