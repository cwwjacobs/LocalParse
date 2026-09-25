import { test } from "node:test";
import assert from "node:assert/strict";
import Exporter from "../src/components/exporter.js";
import { PARTIAL_MARKER_KEY } from "../src/utils/exportData.js";
import { makeApp } from "./helpers.js";

function makeExporter() {
    const app = makeApp();
    const exporter = new Exporter(app);
    const downloads = [];
    exporter.download = (content, filename, mimeType) => {
        downloads.push({ content, filename, mimeType });
    };
    exporter.mount();
    return { app, exporter, downloads };
}

function stubAlert(t) {
    const messages = [];
    const original = globalThis.alert;
    globalThis.alert = msg => messages.push(msg);
    t.after(() => { globalThis.alert = original; });
    return messages;
}

test("export is blocked when nothing has loaded", t => {
    const alerts = stubAlert(t);
    const { app, downloads } = makeExporter();

    app.emit("export-json");
    app.emit("export-jsonl");

    assert.equal(downloads.length, 0);
    assert.equal(alerts.length, 2);
    assert.match(alerts[0], /No data available to export/);
});

test("clean data exports unmarked JSON and JSONL", t => {
    stubAlert(t);
    const { app, downloads } = makeExporter();
    app.emit("data-loaded", {
        type: "jsonl",
        success: true,
        partial: false,
        data: [{ a: 1 }, { b: 2 }],
        errors: []
    });

    app.emit("export-json");
    app.emit("export-jsonl");

    assert.equal(downloads.length, 2);
    assert.equal(downloads[0].filename, "export.json");
    assert.deepEqual(JSON.parse(downloads[0].content), [{ a: 1 }, { b: 2 }]);
    assert.equal(downloads[1].filename, "export.jsonl");
    assert.equal(downloads[1].content, '{"a":1}\n{"b":2}');
});

test("a JSON document of null is still exportable once loaded", t => {
    stubAlert(t);
    const { app, downloads } = makeExporter();
    app.emit("data-loaded", {
        type: "json",
        success: true,
        partial: false,
        data: null,
        errors: []
    });

    app.emit("export-json");
    assert.equal(downloads.length, 1);
    assert.equal(downloads[0].content, "null");
});

test("partial (recovery) data exports marked in filename and content", t => {
    stubAlert(t);
    const { app, downloads } = makeExporter();
    app.emit("data-loaded", {
        type: "jsonl",
        success: false,
        partial: true,
        data: [{ a: 1 }, { b: 2 }],
        errors: [
            { line: 2, message: "x", source: "BAD" },
            { line: 4, message: "x", source: "WORSE" }
        ],
        validRows: 2,
        totalRows: 4
    });

    app.emit("export-jsonl");
    app.emit("export-json");

    assert.equal(downloads.length, 2);

    const jsonl = downloads[0];
    assert.equal(jsonl.filename, "export.partial.jsonl");
    const lines = jsonl.content.split("\n");
    assert.equal(lines.length, 3);
    assert.deepEqual(JSON.parse(lines[0])[PARTIAL_MARKER_KEY].skippedLines, [2, 4]);

    const json = downloads[1];
    assert.equal(json.filename, "export.partial.json");
    const envelope = JSON.parse(json.content);
    assert.deepEqual(envelope[PARTIAL_MARKER_KEY].skippedLines, [2, 4]);
    assert.deepEqual(envelope.data, [{ a: 1 }, { b: 2 }]);
});

test("clear-all blocks export again so stale data cannot leak", t => {
    const alerts = stubAlert(t);
    const { app, downloads } = makeExporter();
    app.emit("data-loaded", {
        type: "json",
        success: true,
        partial: false,
        data: { a: 1 },
        errors: []
    });
    app.emit("clear-all");
    app.emit("export-json");

    assert.equal(downloads.length, 0);
    assert.match(alerts[0], /No data available to export/);
});

test("loading clean data after a partial import clears the partial marking", t => {
    stubAlert(t);
    const { app, downloads } = makeExporter();
    app.emit("data-loaded", {
        type: "jsonl",
        success: false,
        partial: true,
        data: [{ a: 1 }],
        errors: [{ line: 9, message: "x", source: "BAD" }],
        validRows: 1,
        totalRows: 2
    });
    app.emit("data-loaded", {
        type: "json",
        success: true,
        partial: false,
        data: { clean: true },
        errors: []
    });

    app.emit("export-json");
    assert.equal(downloads[0].filename, "export.json");
    assert.deepEqual(JSON.parse(downloads[0].content), { clean: true });
});
