import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJSON, getPartialInfo } from "../src/utils/parseJSON.js";
import { buildExport, buildPartialMarker, toJSONL, PARTIAL_MARKER_KEY } from "../src/utils/exportData.js";

// ---------------- clean exports ----------------

test("clean JSON export keeps the existing filename and content shape", () => {
    const data = { a: 1, b: [1, 2] };
    const out = buildExport(data, "json");
    assert.equal(out.filename, "export.json");
    assert.equal(out.mimeType, "application/json");
    assert.equal(out.partial, false);
    assert.equal(out.content, JSON.stringify(data, null, 2));
});

test("clean JSONL export writes one row per line", () => {
    const data = [{ a: 1 }, { b: 2 }];
    const out = buildExport(data, "jsonl");
    assert.equal(out.filename, "export.jsonl");
    assert.equal(out.mimeType, "application/jsonl");
    assert.equal(out.partial, false);
    assert.equal(out.content, '{"a":1}\n{"b":2}');
});

test("single-object JSONL export writes a single line", () => {
    assert.equal(toJSONL({ a: 1 }), '{"a":1}');
});

test("unsupported formats are rejected", () => {
    assert.throws(() => buildExport({}, "csv"), /Unsupported export format/);
});

// ---------------- round trips ----------------

test("JSON -> export -> parse round trip preserves data", () => {
    const original = { users: [{ id: 1 }, { id: 2 }], meta: { total: 2 } };
    const parsed = parseJSON(JSON.stringify(original));
    assert.equal(parsed.success, true);

    const out = buildExport(parsed.data, "json");
    assert.deepEqual(JSON.parse(out.content), original);

    const asJsonl = buildExport(parsed.data, "jsonl");
    const reparsed = parseJSON(asJsonl.content);
    assert.equal(reparsed.success, true);
    assert.deepEqual(reparsed.data, original);
});

test("JSONL -> export JSONL -> parse round trip preserves every row", () => {
    const text = '{"a":1}\n[1,2]\n"s"\nnull\n{"b":{"c":[true]}}';
    const parsed = parseJSON(text);
    assert.equal(parsed.success, true);

    const out = buildExport(parsed.data, "jsonl");
    const reparsed = parseJSON(out.content);
    assert.equal(reparsed.success, true);
    assert.deepEqual(reparsed.data, parsed.data);

    const asJson = buildExport(parsed.data, "json");
    assert.deepEqual(JSON.parse(asJson.content), parsed.data);
});

test("large dataset survives a JSONL round trip intact", () => {
    const count = 50000;
    const data = Array.from({ length: count }, (_, i) => ({ i, s: `row${i}` }));
    const out = buildExport(data, "jsonl");
    const reparsed = parseJSON(out.content);
    assert.equal(reparsed.success, true);
    assert.equal(reparsed.data.length, count);
    assert.deepEqual(reparsed.data[count - 1], { i: count - 1, s: `row${count - 1}` });
});

// ---------------- partial exports are marked ----------------

const partialInfo = { skippedLines: [2, 4], skippedCount: 2, validRows: 2, totalRows: 4 };

test("partial JSONL export is renamed and carries a leading marker line", () => {
    const rows = [{ a: 1 }, { b: 2 }];
    const out = buildExport(rows, "jsonl", partialInfo);
    assert.equal(out.partial, true);
    assert.equal(out.filename, "export.partial.jsonl");

    const lines = out.content.split("\n");
    assert.equal(lines.length, 3);
    const marker = JSON.parse(lines[0]);
    assert.deepEqual(marker[PARTIAL_MARKER_KEY].skippedLines, [2, 4]);
    assert.equal(marker[PARTIAL_MARKER_KEY].skippedCount, 2);
    assert.equal(marker[PARTIAL_MARKER_KEY].totalRows, 4);
    assert.deepEqual(JSON.parse(lines[1]), { a: 1 });
    assert.deepEqual(JSON.parse(lines[2]), { b: 2 });
});

test("partial JSON export wraps data in a marked envelope", () => {
    const rows = [{ a: 1 }, { b: 2 }];
    const out = buildExport(rows, "json", partialInfo);
    assert.equal(out.partial, true);
    assert.equal(out.filename, "export.partial.json");

    const envelope = JSON.parse(out.content);
    assert.deepEqual(envelope[PARTIAL_MARKER_KEY].skippedLines, [2, 4]);
    assert.deepEqual(envelope.data, rows);
    assert.equal(Object.hasOwn(envelope, "data"), true);
});

test("a partial export can never pass a strict re-import as clean JSONL", () => {
    // Re-importing a marked partial JSONL export yields the marker row too,
    // so the partial marker is preserved rather than laundered away.
    const out = buildExport([{ a: 1 }], "jsonl", partialInfo);
    const reparsed = parseJSON(out.content);
    assert.equal(reparsed.success, true);
    assert.equal(reparsed.data.length, 2);
    assert.ok(reparsed.data[0][PARTIAL_MARKER_KEY]);
});

test("buildPartialMarker is deterministic (no timestamps)", () => {
    assert.deepEqual(buildPartialMarker(partialInfo), buildPartialMarker(partialInfo));
});

test("getPartialInfo output drives the marker end to end", () => {
    const result = parseJSON('{"a":1}\nBAD\n{"b":2}\nWORSE');
    const info = getPartialInfo(result);
    const out = buildExport(result.data, "jsonl", info);
    const marker = JSON.parse(out.content.split("\n")[0]);
    assert.deepEqual(marker[PARTIAL_MARKER_KEY].skippedLines, [2, 4]);
    assert.equal(marker[PARTIAL_MARKER_KEY].validRows, 2);
});
