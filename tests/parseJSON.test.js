import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseJSON, getPartialInfo, summarizeErrors } from "../src/utils/parseJSON.js";

// ---------------- strict JSON ----------------

test("valid strict JSON parses with zero errors", () => {
    const result = parseJSON('{"name":"Alice","tags":["a","b"]}');
    assert.equal(result.success, true);
    assert.equal(result.type, "json");
    assert.equal(result.partial, false);
    assert.deepEqual(result.data, { name: "Alice", tags: ["a", "b"] });
    assert.deepEqual(result.errors, []);
    assert.equal(result.error, null);
});

test("JSON scalars and null are valid strict JSON", () => {
    for (const text of ["42", '"str"', "true", "null", "[1,2,3]"]) {
        const result = parseJSON(text);
        assert.equal(result.success, true, text);
        assert.equal(result.type, "json");
    }
    assert.equal(parseJSON("null").data, null);
});

test("malformed strict JSON is rejected with a line-numbered error", () => {
    const result = parseJSON("{bad json");
    assert.equal(result.success, false);
    assert.equal(result.partial, false);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].line, 1);
    assert.equal(typeof result.errors[0].message, "string");
    assert.equal(result.errors[0].source, "{bad json");
    assert.match(result.error, /line 1/);
});

test("malformed multi-line JSON reports every failing line", () => {
    const result = parseJSON('{\n  "a": 1,\n}');
    assert.equal(result.success, false);
    assert.deepEqual(result.errors.map(e => e.line), [1, 2, 3]);
});

test("empty and whitespace-only files are rejected", () => {
    for (const text of ["", "   \n \n  ", "\t"]) {
        const result = parseJSON(text);
        assert.equal(result.success, false, JSON.stringify(text));
        assert.equal(result.type, "error");
        assert.equal(result.partial, false);
    }
});

// ---------------- JSONL line numbers ----------------

test("valid JSONL parses every row", () => {
    const result = parseJSON('{"a":1}\n{"b":2}\n{"c":3}');
    assert.equal(result.success, true);
    assert.equal(result.type, "jsonl");
    assert.deepEqual(result.data, [{ a: 1 }, { b: 2 }, { c: 3 }]);
    assert.equal(result.validRows, 3);
    assert.equal(result.totalRows, 3);
});

test("bad first JSONL line is reported at line 1 and strict fails", () => {
    const result = parseJSON('BAD\n{"a":1}\n{"b":2}');
    assert.equal(result.success, false);
    assert.equal(result.partial, true);
    assert.deepEqual(result.errors.map(e => e.line), [1]);
    assert.deepEqual(result.data, [{ a: 1 }, { b: 2 }]);
    assert.equal(result.validRows, 2);
    assert.equal(result.totalRows, 3);
});

test("bad middle JSONL line is reported at its exact line", () => {
    const result = parseJSON('{"a":1}\nNOT JSON\n{"b":2}');
    assert.equal(result.success, false);
    assert.equal(result.partial, true);
    assert.deepEqual(result.errors.map(e => e.line), [2]);
});

test("bad last JSONL line is reported at its exact line", () => {
    const result = parseJSON('{"a":1}\n{"b":2}\n{broken}');
    assert.equal(result.success, false);
    assert.equal(result.partial, true);
    assert.deepEqual(result.errors.map(e => e.line), [3]);
});

test("blank lines are skipped as rows but counted in line numbers", () => {
    const result = parseJSON('{"a":1}\n\nBAD\n\n{"b":2}\n');
    assert.equal(result.success, false);
    assert.equal(result.partial, true);
    assert.deepEqual(result.errors.map(e => e.line), [3]);
    assert.equal(result.validRows, 2);
    assert.equal(result.totalRows, 2 + 1);
});

test("all-blank-line-free mixed file reports every bad line exactly", () => {
    const result = parseJSON('x1\n{"ok":1}\nx2\n{"ok":2}\nx3');
    assert.equal(result.success, false);
    assert.equal(result.partial, true);
    assert.deepEqual(result.errors.map(e => e.line), [1, 3, 5]);
    assert.deepEqual(result.data, [{ ok: 1 }, { ok: 2 }]);
});

test("all-invalid JSONL yields no partial recovery", () => {
    const result = parseJSON("x\ny\nz");
    assert.equal(result.success, false);
    assert.equal(result.partial, false);
    assert.deepEqual(result.data, []);
    assert.deepEqual(result.errors.map(e => e.line), [1, 2, 3]);
    assert.equal(result.validRows, 0);
    assert.equal(getPartialInfo(result), null);
});

test("CRLF line endings keep correct line numbers", () => {
    const result = parseJSON('{"a":1}\r\nBAD\r\n{"b":2}');
    assert.equal(result.partial, true);
    assert.deepEqual(result.errors.map(e => e.line), [2]);
    assert.deepEqual(result.data, [{ a: 1 }, { b: 2 }]);
});

test("JSONL rows may be any JSON value", () => {
    const result = parseJSON('1\ntrue\n"x"\nnull\n[1]\n{"a":1}');
    assert.equal(result.success, true);
    assert.deepEqual(result.data, [1, true, "x", null, [1], { a: 1 }]);
});

test("error entries carry line, message and source excerpt", () => {
    const long = "{" + "x".repeat(200);
    const result = parseJSON(long);
    assert.equal(result.errors[0].line, 1);
    assert.ok(result.errors[0].message.length > 0);
    assert.ok(result.errors[0].source.length <= 120);
});

// ---------------- partial info ----------------

test("getPartialInfo lists exact skipped lines and row counts", () => {
    const result = parseJSON('{"a":1}\nBAD\n{"b":2}\nWORSE');
    const info = getPartialInfo(result);
    assert.deepEqual(info.skippedLines, [2, 4]);
    assert.equal(info.skippedCount, 2);
    assert.equal(info.validRows, 2);
    assert.equal(info.totalRows, 4);
});

test("getPartialInfo returns null for clean results", () => {
    assert.equal(getPartialInfo(parseJSON('{"a":1}')), null);
    assert.equal(getPartialInfo(parseJSON('{"a":1}\n{"b":2}')), null);
});

test("summarizeErrors caps long line lists", () => {
    const errors = Array.from({ length: 25 }, (_, i) => ({ line: i + 1 }));
    const summary = summarizeErrors(errors, 30);
    assert.match(summary, /25 of 30/);
    assert.match(summary, /\+15 more/);
});

// ---------------- large files ----------------

test("large valid JSONL file parses completely", () => {
    const count = 100000;
    const text = Array.from({ length: count }, (_, i) => `{"i":${i}}`).join("\n");
    const result = parseJSON(text);
    assert.equal(result.success, true);
    assert.equal(result.validRows, count);
    assert.equal(result.data.length, count);
    assert.deepEqual(result.data[count - 1], { i: count - 1 });
});

test("one bad row near the end of a large file is caught with its exact line", () => {
    const count = 100000;
    const lines = Array.from({ length: count }, (_, i) => `{"i":${i}}`);
    lines[count - 2] = "BROKEN";
    const result = parseJSON(lines.join("\n"));
    assert.equal(result.success, false);
    assert.equal(result.partial, true);
    assert.deepEqual(result.errors.map(e => e.line), [count - 1]);
    assert.equal(result.validRows, count - 1);
});

// ---------------- cancellation ----------------

test("a pre-aborted signal fails closed", () => {
    const controller = new AbortController();
    controller.abort();
    const result = parseJSON('{"a":1}', { signal: controller.signal });
    assert.equal(result.aborted, true);
    assert.equal(result.success, false);
    assert.equal(result.data, null);
});

test("a signal aborted mid-parse stops the JSONL loop and fails closed", () => {
    let checks = 0;
    const fakeSignal = {
        get aborted() {
            checks += 1;
            return checks > 10;
        }
    };
    const text = Array.from({ length: 1000 }, (_, i) => `{"i":${i}}`).join("\n");
    const result = parseJSON(text, { signal: fakeSignal });
    assert.equal(result.aborted, true);
    assert.equal(result.success, false);
    assert.equal(result.partial, false);
    assert.equal(result.data, null);
});

test("parsing without a signal behaves as before", () => {
    const result = parseJSON('{"a":1}\n{"b":2}', {});
    assert.equal(result.success, true);
});

// ---------------- repository samples ----------------

test("the checked-in sample files parse strictly clean", () => {
    const sampleJson = readFileSync(new URL("../sample.json", import.meta.url), "utf8");
    const sampleJsonl = readFileSync(new URL("../sample.jsonl", import.meta.url), "utf8");
    const json = parseJSON(sampleJson);
    const jsonl = parseJSON(sampleJsonl);
    assert.equal(json.success, true);
    assert.equal(json.type, "json");
    assert.equal(jsonl.success, true);
    assert.equal(jsonl.type, "jsonl");
    assert.equal(jsonl.data.length, 3);
});
