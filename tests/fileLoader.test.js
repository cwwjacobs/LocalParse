import { test } from "node:test";
import assert from "node:assert/strict";
import FileLoader from "../src/components/fileLoader.js";
import { makeApp, makeFile } from "./helpers.js";

test("strict load of a valid file imports data and emits data-loaded", async () => {
    const app = makeApp();
    const loader = new FileLoader(app);
    await loader.loadFile(makeFile("ok.jsonl", '{"a":1}\n{"b":2}'));

    assert.deepEqual(app.data, [{ a: 1 }, { b: 2 }]);
    assert.equal(app.partial, null);
    assert.equal(app.fileName, "ok.jsonl");
    assert.equal(app.eventsOf("data-loaded").length, 1);
    assert.equal(app.eventsOf("data-loaded")[0].payload.success, true);
    assert.equal(app.eventsOf("error").length, 0);
});

test("unsupported extensions are rejected before parsing", async () => {
    const app = makeApp();
    const loader = new FileLoader(app);
    await loader.loadFile(makeFile("data.txt", '{"a":1}'));

    assert.equal(app.data, null);
    assert.equal(app.eventsOf("data-loaded").length, 0);
    assert.match(app.eventsOf("error")[0].payload, /Only \.json and \.jsonl/);
});

test("malformed strict JSON is rejected and imports nothing", async () => {
    const app = makeApp();
    const loader = new FileLoader(app);
    await loader.loadFile(makeFile("bad.json", "{not json"));

    assert.equal(app.data, null);
    assert.equal(app.eventsOf("data-loaded").length, 0);
    assert.equal(app.eventsOf("partial-available").length, 0);
    const errors = app.eventsOf("error");
    assert.equal(errors.length, 1);
    assert.match(errors[0].payload, /Invalid JSON document/);
});

test("REGRESSION: mixed JSONL no longer silently loads the valid subset", async () => {
    const app = makeApp();
    const loader = new FileLoader(app);
    await loader.loadFile(makeFile("mixed.jsonl", '{"a":1}\nBAD\n{"b":2}'));

    // The old behavior called setData([{a:1},{b:2}]) here. It must not.
    assert.equal(app.data, null);
    assert.equal(app.eventsOf("data-loaded").length, 0);

    const partialEvents = app.eventsOf("partial-available");
    assert.equal(partialEvents.length, 1);
    assert.equal(partialEvents[0].payload.fileName, "mixed.jsonl");
    assert.deepEqual(partialEvents[0].payload.result.errors.map(e => e.line), [2]);

    const errors = app.eventsOf("error");
    assert.equal(errors.length, 1);
    assert.match(errors[0].payload, /line 2/);
    assert.match(errors[0].payload, /no rows were imported/i);
});

test("all-invalid JSONL offers no recovery and imports nothing", async () => {
    const app = makeApp();
    const loader = new FileLoader(app);
    await loader.loadFile(makeFile("bad.jsonl", "x\ny\nz"));

    assert.equal(app.data, null);
    assert.equal(app.eventsOf("partial-available").length, 0);
    assert.equal(app.eventsOf("error").length, 1);
});

test("a rejected file does not wipe a previously loaded dataset", async () => {
    const app = makeApp();
    const loader = new FileLoader(app);
    await loader.loadFile(makeFile("ok.json", '{"keep":true}'));
    await loader.loadFile(makeFile("bad.jsonl", "x\ny"));

    assert.deepEqual(app.data, { keep: true });
    assert.equal(app.fileName, "ok.json");
});

test("recovery is opt-in: loadPendingRecovery imports valid rows marked partial", async () => {
    const app = makeApp();
    const loader = new FileLoader(app);
    await loader.loadFile(makeFile("mixed.jsonl", '{"a":1}\nBAD\n{"b":2}\nWORSE'));
    assert.equal(app.data, null);

    await loader.loadPendingRecovery();

    assert.deepEqual(app.data, [{ a: 1 }, { b: 2 }]);
    assert.equal(app.fileName, "mixed.jsonl");
    assert.deepEqual(app.partial.skippedLines, [2, 4]);
    assert.equal(app.partial.skippedCount, 2);
    assert.equal(app.partial.totalRows, 4);

    const loaded = app.eventsOf("data-loaded");
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].payload.partial, true);
    assert.deepEqual(loaded[0].payload.partialInfo.skippedLines, [2, 4]);
});

test("loadPendingRecovery without a rejected file is a no-op", async () => {
    const app = makeApp();
    const loader = new FileLoader(app);
    await loader.loadPendingRecovery();
    assert.equal(app.events.length, 0);
});

test("recovery mode on an all-invalid file still imports nothing", async () => {
    const app = makeApp();
    const loader = new FileLoader(app);
    await loader.loadFile(makeFile("bad.jsonl", "x\ny"), { mode: "recovery" });

    assert.equal(app.data, null);
    assert.equal(app.eventsOf("data-loaded").length, 0);
    assert.equal(app.eventsOf("error").length, 1);
});

test("a successful load clears any pending recovery offer", async () => {
    const app = makeApp();
    const loader = new FileLoader(app);
    await loader.loadFile(makeFile("mixed.jsonl", '{"a":1}\nBAD'));
    assert.equal(app.eventsOf("partial-available").length, 1);

    await loader.loadFile(makeFile("ok.json", '{"ok":1}'));
    assert.deepEqual(app.data, { ok: 1 });
    assert.equal(app.partial, null);

    // The stale recovery offer no longer resolves to anything.
    await loader.loadPendingRecovery();
    assert.equal(app.eventsOf("data-loaded").length, 1);
});

test("a superseded load aborts silently; only the newer load emits", async () => {
    const app = makeApp();
    const loader = new FileLoader(app);

    const slowText = Array.from({ length: 5000 }, (_, i) => `{"i":${i}}`).join("\n");
    const slowFile = {
        name: "slow.jsonl",
        text: () => new Promise(resolve => setTimeout(() => resolve(slowText), 25))
    };
    const fastFile = makeFile("fast.json", '{"ok":true}');

    await Promise.all([loader.loadFile(slowFile), loader.loadFile(fastFile)]);

    const loaded = app.eventsOf("data-loaded");
    assert.equal(loaded.length, 1);
    assert.equal(app.fileName, "fast.json");
    assert.deepEqual(app.data, { ok: true });
    assert.equal(app.eventsOf("error").length, 0);
});

test("large file through the loader: one bad row is rejected with its line", async () => {
    const app = makeApp();
    const loader = new FileLoader(app);
    const count = 50000;
    const lines = Array.from({ length: count }, (_, i) => `{"i":${i}}`);
    lines[count - 1] = "BROKEN";
    await loader.loadFile(makeFile("big.jsonl", lines.join("\n")));

    assert.equal(app.data, null);
    const partialEvents = app.eventsOf("partial-available");
    assert.equal(partialEvents.length, 1);
    assert.deepEqual(partialEvents[0].payload.result.errors.map(e => e.line), [count]);
});

test("a file read failure surfaces as an error event", async () => {
    const app = makeApp();
    const loader = new FileLoader(app);
    const file = { name: "x.json", text: async () => { throw new Error("read fail"); } };
    await loader.loadFile(file);

    assert.equal(app.data, null);
    assert.match(app.eventsOf("error")[0].payload, /read fail/);
});

for (const mode of ["strict", "recovery"]) {
    test(`malformed pretty JSON never becomes JSONL recovery in ${mode} mode`, async () => {
        const app = makeApp();
        const loader = new FileLoader(app);
        await loader.loadFile(makeFile("broken.JSON", '[\n{"a":1}\nBROKEN\n]'), { mode });
        assert.equal(app.data, null);
        assert.equal(loader.pendingRecovery, null);
        assert.equal(app.eventsOf("partial-available").length, 0);
        assert.equal(app.eventsOf("data-loaded").length, 0);
        assert.match(app.eventsOf("error")[0].payload, /Invalid JSON document/);
    });
}

test("extension selects JSONL even for a single valid row", async () => {
    const app = makeApp();
    const loader = new FileLoader(app);
    await loader.loadFile(makeFile("one.JSONL", '{"a":1}'));
    assert.deepEqual(app.data, [{ a: 1 }]);
    assert.equal(app.eventsOf("data-loaded")[0].payload.type, "jsonl");
});
