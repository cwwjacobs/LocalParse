/**
 * JSONTreeViewer - Interactive tree viewer for JSON data
 * Supports expand/collapse, navigation, and breadcrumbs
 */

import { getValueType, countItems } from '../utils/parseJSON.js';

export default class JSONTreeViewer {
    constructor(app) {
        this.app = app;
        this.element = null;
        this.data = null;
        this.expandedPaths = new Set();
        this.currentPath = [];
    }

    mount() {
        this.element = document.getElementById("viewer");
        if (!this.element) {
            console.error("[JSONTreeViewer] #viewer not found.");
            return;
        }
        this.app.on("data-loaded", (result) => this.render(result, true)); // Clear expanded paths on new data
        this.app.on("clear-all", () => this.clear());
    }

    render(result, clearExpanded = false) {
        if (!result || !result.success) {
            this.element.innerHTML = `
                <div class="error">
                    <strong>Error:</strong> ${result?.error || 'Failed to load data'}
                </div>
            `;
            return;
        }

        this.data = result.data;
        if (clearExpanded) {
            this.expandedPaths.clear();
            this.currentPath = [];
        }

        const html = `
            <div class="breadcrumbs">
                <span class="breadcrumb active" data-path="">Root</span>
            </div>
            <div class="stats-panel">
                <div class="stat-item">
                    <span class="stat-label">Format:</span>
                    <span class="stat-value">${result.type.toUpperCase()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Type:</span>
                    <span class="stat-value">${getValueType(this.data)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Items:</span>
                    <span class="stat-value">${countItems(this.data)}</span>
                </div>
            </div>
            <div class="json-container">
                ${this.renderValue(this.data, [], 0)}
            </div>
        `;

        this.element.innerHTML = html;
        this.attachEvents();
    }

    renderValue(value, path, depth) {
        const type = getValueType(value);
        const pathKey = path.join('.');
        const isExpanded = this.expandedPaths.has(pathKey);

        if (type === 'object' || type === 'array') {
            const count = countItems(value);
            const entries = type === 'array' 
                ? value.map((v, i) => [i, v])
                : Object.entries(value);

            const bracket = type === 'array' ? ['[', ']'] : ['{', '}'];
            
            let html = '';
            
            // Opening bracket with expand/collapse
            html += `<div class="json-line">`;
            html += `<span class="json-indent" style="width: ${depth * 20}px"></span>`;
            html += `<span class="json-expand" data-path="${pathKey}">${isExpanded ? '▼' : '▶'}</span>`;
            html += `<span class="json-bracket">${bracket[0]}</span>`;
            if (!isExpanded) {
                html += `<span class="json-collapsed"> ${count} items </span>`;
                html += `<span class="json-bracket">${bracket[1]}</span>`;
            }
            html += `</div>`;

            // Expanded content
            if (isExpanded) {
                for (const [key, val] of entries) {
                    const newPath = [...path, key];
                    const childPathKey = newPath.join('.');
                    
                    html += `<div class="json-line">`;
                    html += `<span class="json-indent" style="width: ${(depth + 1) * 20}px"></span>`;
                    
                    const childType = getValueType(val);
                    if (childType === 'object' || childType === 'array') {
                        const childCount = countItems(val);
                        const childExpanded = this.expandedPaths.has(childPathKey);
                        html += `<span class="json-expand" data-path="${childPathKey}">${childExpanded ? '▼' : '▶'}</span>`;
                    } else {
                        html += `<span class="json-expand" style="visibility: hidden">•</span>`;
                    }
                    
                    html += `<span class="json-key">"${this.escapeHtml(String(key))}":</span>`;
                    html += this.renderInlineValue(val, newPath, depth + 1);
                    html += `</div>`;

                    // Recursively render nested objects/arrays
                    if ((childType === 'object' || childType === 'array') && this.expandedPaths.has(childPathKey)) {
                        html += this.renderValue(val, newPath, depth + 1);
                    }
                }

                // Closing bracket
                html += `<div class="json-line">`;
                html += `<span class="json-indent" style="width: ${depth * 20}px"></span>`;
                html += `<span class="json-bracket">${bracket[1]}</span>`;
                html += `</div>`;
            }

            return html;
        }

        return this.renderInlineValue(value, path, depth);
    }

    renderInlineValue(value, path, depth) {
        const type = getValueType(value);
        const pathKey = path.join('.');

        if (type === 'object' || type === 'array') {
            const count = countItems(value);
            const isExpanded = this.expandedPaths.has(pathKey);
            const bracket = type === 'array' ? ['[', ']'] : ['{', '}'];
            
            if (isExpanded) {
                return '';  // Will be rendered in full by renderValue
            } else {
                return `<span class="json-bracket">${bracket[0]}</span>
                        <span class="json-collapsed"> ${count} items </span>
                        <span class="json-bracket">${bracket[1]}</span>`;
            }
        }

        if (type === 'string') {
            return `<span class="json-value string">"${this.escapeHtml(value)}"</span>`;
        }

        if (type === 'number') {
            return `<span class="json-value number">${value}</span>`;
        }

        if (type === 'boolean') {
            return `<span class="json-value boolean">${value}</span>`;
        }

        if (type === 'null') {
            return `<span class="json-value null">null</span>`;
        }

        return `<span class="json-value">${this.escapeHtml(String(value))}</span>`;
    }

    attachEvents() {
        // Expand/collapse toggles
        const expanders = this.element.querySelectorAll('.json-expand');
        expanders.forEach(expander => {
            expander.addEventListener('click', (e) => {
                const path = e.target.dataset.path;
                if (this.expandedPaths.has(path)) {
                    this.expandedPaths.delete(path);
                } else {
                    this.expandedPaths.add(path);
                }
                this.render({ success: true, data: this.data, type: 'json' }, false); // Don't clear expanded paths
            });
        });
    }

    clear() {
        this.element.innerHTML = '<div class="empty">No data loaded. Click "Load File" to begin.</div>';
        this.data = null;
        this.expandedPaths.clear();
        this.currentPath = [];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
