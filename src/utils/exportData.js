/**
 * exportData - Pure builders for exported file content.
 *
 * A partial export (from an explicit recovery import) is always marked in two
 * places so it can never be mistaken for a complete load:
 *   - the filename becomes `export.partial.json` / `export.partial.jsonl`
 *   - the content carries a `_localparse_partial` marker record listing the
 *     exact skipped source lines (an envelope key for JSON, a leading
 *     metadata line for JSONL)
 */

export const PARTIAL_MARKER_KEY = "_localparse_partial";

export function toJSONL(data) {
    if (Array.isArray(data)) {
        return data.map(item => JSON.stringify(item)).join('\n');
    }
    return JSON.stringify(data);
}

export function buildPartialMarker(partialInfo) {
    return {
        [PARTIAL_MARKER_KEY]: {
            source: "LocalParse partial recovery export",
            skippedLines: [...partialInfo.skippedLines],
            skippedCount: partialInfo.skippedCount,
            validRows: partialInfo.validRows,
            totalRows: partialInfo.totalRows
        }
    };
}

/**
 * Build an export artifact.
 *
 * @param {*} data loaded data (valid rows only for a partial import)
 * @param {'json'|'jsonl'} format target format
 * @param {object|null} partialInfo getPartialInfo() output; null for a
 *   complete, strictly-loaded file
 * @returns {{content: string, filename: string, mimeType: string, partial: boolean}}
 */
export function buildExport(data, format, partialInfo = null) {
    if (format !== 'json' && format !== 'jsonl') {
        throw new Error(`Unsupported export format: ${format}`);
    }

    const extension = format === 'jsonl' ? 'jsonl' : 'json';
    const mimeType = format === 'jsonl' ? 'application/jsonl' : 'application/json';

    if (!partialInfo) {
        return {
            content: format === 'jsonl' ? toJSONL(data) : JSON.stringify(data, null, 2),
            filename: `export.${extension}`,
            mimeType: mimeType,
            partial: false
        };
    }

    const marker = buildPartialMarker(partialInfo);

    if (format === 'jsonl') {
        const rows = toJSONL(data);
        return {
            content: JSON.stringify(marker) + (rows ? '\n' + rows : ''),
            filename: 'export.partial.jsonl',
            mimeType: mimeType,
            partial: true
        };
    }

    return {
        content: JSON.stringify({ ...marker, data: data }, null, 2),
        filename: 'export.partial.json',
        mimeType: mimeType,
        partial: true
    };
}
