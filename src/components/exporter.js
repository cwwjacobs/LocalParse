import { getPartialInfo } from "../utils/parseJSON.js";
import { buildExport } from "../utils/exportData.js";

export default class Exporter {
    constructor(app) {
        this.app = app;
        this.data = null;
        this.partial = null;
        this.hasData = false;
    }

    mount() {
        this.app.on("data-loaded", (result) => {
            this.data = result.data;
            this.partial = result.partial ? getPartialInfo(result) : null;
            this.hasData = true;
        });
        this.app.on("clear-all", () => {
            this.data = null;
            this.partial = null;
            this.hasData = false;
        });
        this.app.on("export-json", () => this.exportJSON());
        this.app.on("export-jsonl", () => this.exportJSONL());
    }

    exportJSON() {
        this.export("json");
    }

    exportJSONL() {
        this.export("jsonl");
    }

    export(format) {
        // Export is only possible for data that actually loaded. A file
        // rejected by strict mode never reaches this state.
        if (!this.hasData) {
            alert("No data available to export.");
            return;
        }

        try {
            const out = buildExport(this.data, format, this.partial);
            this.download(out.content, out.filename, out.mimeType);
        } catch (err) {
            alert(`Export failed: ${err.message}`);
        }
    }

    download(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
    }
}
