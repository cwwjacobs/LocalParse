/**
 * parseJSON - Handles both JSON and JSONL formats
 * Returns a structured object with the parsed data
 */
export function parseJSON(text) {
    try {
        // First, try to parse as regular JSON
        try {
            const data = JSON.parse(text);
            return {
                type: 'json',
                data: data,
                success: true
            };
        } catch (jsonError) {
            // If JSON parsing fails, try JSONL (JSON Lines)
            const lines = text.split('\n').filter(line => line.trim());
            const parsed = [];
            
            for (let i = 0; i < lines.length; i++) {
                try {
                    parsed.push(JSON.parse(lines[i]));
                } catch (lineError) {
                    // Skip invalid lines but continue
                    console.warn(`Skipping invalid JSON on line ${i + 1}`);
                }
            }
            
            if (parsed.length > 0) {
                return {
                    type: 'jsonl',
                    data: parsed,
                    success: true
                };
            }
            
            throw new Error('Unable to parse as JSON or JSONL');
        }
    } catch (err) {
        console.error("[parseJSON] Error:", err);
        return {
            type: 'error',
            error: err.message,
            success: false
        };
    }
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
