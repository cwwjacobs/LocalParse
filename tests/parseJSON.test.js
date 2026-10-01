import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJSON } from '../src/utils/parseJSON.js';

test('valid JSON keeps JSON detection, including pretty-printed objects and arrays', () => {
    for (const data of [{ name: 'Alice', tags: ['review'] }, [1, { ok: true }]]) {
        assert.deepEqual(parseJSON(JSON.stringify(data, null, 2)), {
            success: true, type: 'json', data
        });
    }
});

for (const data of [false, 0, '', null]) {
    test(`valid JSON scalar ${JSON.stringify(data)} is preserved`, () => {
        assert.deepEqual(parseJSON(JSON.stringify(data)), { success: true, type: 'json', data });
    });
}

test('JSONL preserves every record while allowing blank lines and CRLF', () => {
    const data = [{ name: 'Alice' }, { name: 'Bob' }, false, 0, '', null];
    const text = `\r\n${data.map(value => JSON.stringify(value)).join('\r\n\r\n')}\r\n`;
    assert.deepEqual(parseJSON(text), { success: true, type: 'jsonl', data });
});

test('a single JSON value retains existing JSON-first detection', () => {
    assert.equal(parseJSON('{"name":"Alice"}\n').type, 'json');
});

for (const [label, text, line] of [
    ['middle record after a blank line', '{"ok":1}\n\n{broken}\n{"ok":2}', 3],
    ['first record', 'broken\n{"ok":1}', 1],
    ['last record', '{"ok":1}\n{"ok":2}\n{"bad":}', 3],
    ['CRLF record', '\r\n{"ok":1}\r\n\r\nnope\r\n', 4]
]) {
    test(`malformed JSONL rejects the whole file: ${label}`, t => {
        t.mock.method(console, 'error', () => {});
        const result = parseJSON(text);
        assert.equal(result.success, false);
        assert.equal(result.type, 'error');
        assert.match(result.error, new RegExp(`Invalid JSONL on line ${line}: .+`));
        assert.equal(Object.hasOwn(result, 'data'), false, 'must not return partial records');
    });
}

test('empty input is a failure, rather than an empty successful JSONL dataset', t => {
    t.mock.method(console, 'error', () => {});
    assert.equal(parseJSON(' \n\t\n').success, false);
});
