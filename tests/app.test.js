import test from 'node:test';
import assert from 'node:assert/strict';
import App from '../src/app.js';
import { createDocument } from './helpers/fakeDom.js';

function setupApp(t) {
    const previous = {};
    const alerts = [];
    for (const key of ['document', 'alert', 'confirm']) {
        previous[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    }
    globalThis.document = createDocument();
    globalThis.alert = message => alerts.push(message);
    globalThis.confirm = () => true;
    t.after(() => {
        for (const key of Object.keys(previous)) {
            if (previous[key]) Object.defineProperty(globalThis, key, previous[key]);
            else delete globalThis[key];
        }
    });
    t.mock.method(console, 'log', () => {});
    t.mock.method(console, 'error', () => {});
    const app = new App();
    app.init();
    const downloads = [];
    t.mock.method(app.exporter, 'download', (content, filename, type) => {
        downloads.push({ content, filename, type });
    });
    return { app, alerts, downloads, element: id => document.getElementById(id) };
}

const file = (name, text) => ({ name, text: async () => text });

function toggle(viewer, path) {
    const key = JSON.stringify(path);
    const expander = viewer.element.querySelectorAll('.json-expand[data-path]')
        .find(element => element.dataset.path === key);
    assert.ok(expander, `missing expander for ${key}`);
    expander.click();
}

function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

test('Clear resets app, viewer, exporter, filename, input, and expansion state', async t => {
    const { app, element, downloads, alerts } = setupApp(t);
    const input = element('file-input');
    input.value = 'C:\\fakepath\\data.json';
    await app.fileLoader.loadFile(file('data.json', '{"nested":{"value":1}}'));
    toggle(app.viewer, []);
    toggle(app.viewer, ['nested']);
    assert.equal(element('file-name').textContent, '(data.json)');
    element('nav-export-json').click();
    assert.equal(downloads.length, 1);

    element('nav-clear').click();
    assert.equal(app.data, null);
    assert.equal(app.fileName, '');
    assert.equal(app.navbar.fileName, '');
    assert.equal(element('file-name').textContent, '');
    assert.equal(input.value, '');
    assert.equal(app.viewer.data, null);
    assert.equal(app.viewer.format, null);
    assert.equal(app.viewer.expandedPaths.size, 0);
    assert.deepEqual(app.viewer.currentPath, []);
    assert.match(element('viewer').innerHTML, /No data loaded/);
    assert.equal(app.exporter.data, null);
    assert.equal(app.exporter.hasData, false);
    element('nav-export-json').click();
    element('nav-export-jsonl').click();
    assert.equal(downloads.length, 1, 'cleared data must not be downloaded');
    assert.deepEqual(alerts, ['No data available to export.', 'No data available to export.']);

    // The same file can be selected again after the input has been reset.
    input.files = [file('data.json', '{"reloaded":true}')];
    input.dispatch('change');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(app.data, { reloaded: true });
    assert.equal(app.exporter.hasData, true);
    assert.equal(app.viewer.expandedPaths.size, 0);
});

test('canceling Clear retains the loaded dataset', async t => {
    const { app, element } = setupApp(t);
    await app.fileLoader.loadFile(file('data.json', '{"keep":true}'));
    globalThis.confirm = () => false;
    element('nav-clear').click();
    assert.deepEqual(app.data, { keep: true });
    assert.equal(app.fileName, 'data.json');
    assert.equal(app.exporter.hasData, true);
});

test('Clear is safe repeatedly and clears state when emitted directly', async t => {
    const { app, element } = setupApp(t);
    await app.fileLoader.loadFile(file('data.json', 'null'));
    app.emit('clear-all');
    app.emit('clear-all');
    assert.equal(app.fileName, '');
    assert.equal(element('file-name').textContent, '');
    assert.equal(app.exporter.hasData, false);
});

for (const outcome of ['resolve', 'reject']) {
    test(`a pending file read cannot undo Clear or show a stale error (${outcome})`, async t => {
        const { app, alerts } = setupApp(t);
        const pending = deferred();
        const loading = app.fileLoader.loadFile({ name: 'old.json', text: () => pending.promise });
        app.emit('clear-all');
        pending[outcome](outcome === 'resolve' ? '{"old":true}' : new Error('stale read'));
        await loading;
        assert.equal(app.data, null);
        assert.equal(app.fileName, '');
        assert.equal(app.exporter.hasData, false);
        assert.deepEqual(alerts, []);
    });
}

test('a slower previous read cannot replace a newer selection', async t => {
    const { app } = setupApp(t);
    const pending = deferred();
    const older = app.fileLoader.loadFile({ name: 'old.json', text: () => pending.promise });
    await app.fileLoader.loadFile(file('new.json', '{"new":true}'));
    pending.resolve('{"old":true}');
    await older;
    assert.deepEqual(app.data, { new: true });
    assert.equal(app.fileName, 'new.json');
});

test('JSONL format survives root and nested expansion/collapse', async t => {
    const { app, element } = setupApp(t);
    await app.fileLoader.loadFile(file('data.jsonl', '{"nested":{"x":1}}\n{"x":2}'));
    for (const path of [[], [0], [0, 'nested'], [0, 'nested'], []]) {
        toggle(app.viewer, path);
        assert.equal(app.viewer.format, 'jsonl');
        assert.match(element('viewer').innerHTML, /class="stat-value">JSONL<\/span>/);
    }
});

test('a malformed JSONL load alerts with the original line and never publishes partial data', async t => {
    const { app, alerts } = setupApp(t);
    const loaded = [];
    app.on('data-loaded', result => loaded.push(result));
    await app.fileLoader.loadFile(file('broken.jsonl', '{"ok":1}\n\n{broken}\n{"ok":2}'));
    assert.equal(loaded.length, 0);
    assert.equal(app.data, null);
    assert.equal(app.exporter.hasData, false);
    assert.equal(alerts.length, 1);
    assert.match(alerts[0], /Failed to parse file: Invalid JSONL on line 3:/);
});

test('failed replacement preserves the previously loaded file and its export', async t => {
    const { app, downloads, alerts } = setupApp(t);
    await app.fileLoader.loadFile(file('good.json', '{"keep":true}'));
    await app.fileLoader.loadFile(file('broken.jsonl', '{"ok":1}\n{broken}'));
    assert.deepEqual(app.data, { keep: true });
    assert.equal(app.fileName, 'good.json');
    app.emit('export-json');
    assert.deepEqual(JSON.parse(downloads[0].content), { keep: true });
    assert.equal(alerts.length, 1);
});

test('quoted, markup, entity, empty, and dotted keys have safe unambiguous paths', async t => {
    const { app, element } = setupApp(t);
    const special = '\" onmouseover=\"oops\"><img src=x onerror=oops> &quot; \'\n';
    const data = {
        'a.b': { leaf: 'literal-only' },
        a: { b: { leaf: 'nested-only' } },
        '': { leaf: 'empty-key' },
        [special]: { leaf: 'special-key' }
    };
    await app.fileLoader.loadFile(file('keys.json', JSON.stringify(data)));
    toggle(app.viewer, []);
    const paths = element('viewer').querySelectorAll('.json-expand[data-path]')
        .map(expander => JSON.parse(expander.dataset.path));
    assert.deepEqual(paths, [[], ['a.b'], ['a'], [''], [special]]);
    assert.doesNotMatch(element('viewer').innerHTML, /<img|<script| onmouseover="/);
    assert.match(element('viewer').innerHTML, /&quot;/);
    assert.match(element('viewer').innerHTML, /&lt;img/);

    toggle(app.viewer, ['a.b']);
    assert.match(element('viewer').innerHTML, /literal-only/);
    assert.doesNotMatch(element('viewer').innerHTML, /nested-only/);
    toggle(app.viewer, ['a.b']);
    toggle(app.viewer, ['a']);
    toggle(app.viewer, ['a', 'b']);
    assert.match(element('viewer').innerHTML, /nested-only/);
    assert.doesNotMatch(element('viewer').innerHTML, /literal-only/);
    toggle(app.viewer, ['']);
    assert.equal(app.viewer.expandedPaths.has('[]'), true, 'empty key cannot collapse the root');
    assert.match(element('viewer').innerHTML, /empty-key/);
    toggle(app.viewer, [special]);
    assert.match(element('viewer').innerHTML, /special-key/);
});

for (const [name, text, data] of [
    ['object.json', '{"name":"Alice","items":[1,2]}', { name: 'Alice', items: [1, 2] }],
    ['array.json', '[{"id":1},{"id":2}]', [{ id: 1 }, { id: 2 }]],
    ['records.jsonl', '{"id":1}\n{"id":2}\n', [{ id: 1 }, { id: 2 }]],
    ['false.json', 'false', false],
    ['zero.json', '0', 0],
    ['empty-string.json', '""', ''],
    ['null.json', 'null', null]
]) {
    test(`both exports preserve loaded values: ${name}`, async t => {
        const { app, downloads, alerts } = setupApp(t);
        await app.fileLoader.loadFile(file(name, text));
        app.emit('export-json');
        app.emit('export-jsonl');
        assert.deepEqual(alerts, []);
        assert.equal(downloads.length, 2);
        assert.deepEqual(downloads[0], {
            content: JSON.stringify(data, null, 2), filename: 'export.json', type: 'application/json'
        });
        const lines = Array.isArray(data) ? data.map(value => JSON.stringify(value)).join('\n') : JSON.stringify(data);
        assert.deepEqual(downloads[1], {
            content: lines, filename: 'export.jsonl', type: 'application/jsonl'
        });
    });
}
