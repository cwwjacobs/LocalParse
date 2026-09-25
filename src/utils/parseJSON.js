/**
 * parseJSON - Handles both JSON and JSONL formats
 *
 * Returns a structured result describing exactly what parsed:
 *
 *   {
 *     type:      'json' | 'jsonl' | 'error',
 *     data:      parsed value (json) or array of valid rows (jsonl); null on 'error',
 *     success:   true only when the content parsed with zero errors (strict),
 *     partial:   true when some JSONL rows parsed but others failed,
 *     aborted:   true when parsing was cancelled via options.signal,
 *     error:     human-readable summary string when success is false, else null,
 *     errors:    [{ line, message, source }] with 1-based line numbers from the
 *                original text (blank lines are ignored as rows but still count
 *                toward line numbers),
 *     totalRows: number of nonblank JSONL rows seen (1 for strict JSON),
 *     validRows: number of rows that parsed successfully
 *   }
 *
 * Strict is the default contract: a file is only `success: true` when every
 * nonblank row is valid. Callers that want a partial import must opt in
 * explicitly and label the result (see fileLoader / exporter).
 */
export function parseJSON(text, options = {}) {
    const signal = options.signal || null;
    const isAborted = () => Boolean(signal && signal.aborted);

    if (isAborted()) return abortedResult();

    if (typeof text !== 'string' || text.trim() === '') {
        return {
            type: 'error',
            data: null,
            success: false,
            partial: false,
            aborted: false,
            error: 'File contains no JSON content',
            errors: [],
            totalRows: 0,
            validRows: 0
        };
    }

    // First, try to parse as regular JSON
    try {
        const data = JSON.parse(text);
        return {
            type: 'json',
            data: data,
            success: true,
            partial: false,
            aborted: false,
            error: null,
            errors: [],
            totalRows: 1,
            validRows: 1
        };
    } catch (jsonError) {
        // Not a single JSON document; fall through to JSONL.
    }

    // JSONL: every nonblank line must be valid JSON. A line that fails to
    // parse is recorded with its original 1-based line number; it is never
    // silently dropped from the accounting.
    const lines = text.split('\n');
    const rows = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
        if (isAborted()) return abortedResult();

        const raw = lines[i];
        if (raw.trim() === '') continue;

        try {
            rows.push(JSON.parse(raw));
        } catch (lineError) {
            errors.push({
                line: i + 1,
                message: lineError.message,
                source: raw.length > 120 ? raw.slice(0, 117) + '...' : raw
            });
        }
    }

    const result = {
        type: 'jsonl',
        data: rows,
        success: errors.length === 0 && rows.length > 0,
        partial: errors.length > 0 && rows.length > 0,
        aborted: false,
        error: null,
        errors: errors,
        totalRows: rows.length + errors.length,
        validRows: rows.length
    };

    if (!result.success) {
        result.error = summarizeErrors(errors, result.totalRows);
    }

    return result;
}

function abortedResult() {
    return {
        type: 'error',
        data: null,
        success: false,
        partial: false,
        aborted: true,
        error: 'Parsing aborted',
        errors: [],
        totalRows: 0,
        validRows: 0
    };
}

/**
 * Build a one-line summary of row errors, including exact line numbers.
 */
export function summarizeErrors(errors, totalRows) {
    if (errors.length === 0) return 'File contains no JSON content';
    const lines = errors.map(e => e.line);
    const shown = lines.slice(0, 10).join(', ');
    const more = lines.length > 10 ? `, ... (+${lines.length - 10} more)` : '';
    return `${errors.length} of ${totalRows} JSONL row(s) failed to parse ` +
        `(line${lines.length === 1 ? '' : 's'} ${shown}${more})`;
}

/**
 * Recovery metadata for a partial result: which lines were skipped and how
 * much of the file survived. Returns null for non-partial results so callers
 * cannot accidentally label clean data.
 */
export function getPartialInfo(result) {
    if (!result || !result.partial) return null;
    return {
        skippedLines: result.errors.map(e => e.line),
        skippedCount: result.errors.length,
        validRows: result.validRows,
        totalRows: result.totalRows
    };
}

/**
 * Get the type of a value for display purposes
 */
export function getValueType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return typeof value;
}

/**
 * Count items in an object or array
 */
export function countItems(value) {
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length;
    }
    return 0;
}
