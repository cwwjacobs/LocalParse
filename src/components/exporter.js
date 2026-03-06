export default class Exporter {
    constructor(app) {
        this.app = app;
        this.data = null;
    }

    mount() {
        this.app.on("data-loaded", (result) => this.data = result.data);
        this.app.on("export-json", () => this.exportJSON());
        this.app.on("export-jsonl", () => this.exportJSONL());
    }

    exportJSON() {
        if (!this.data) {
            alert("No data available to export.");
            return;
        }

        try {
            const json = JSON.stringify(this.data, null, 2);
            this.download(json, "export.json", "application/json");
        } catch (err) {
            alert(`Export failed: ${err.message}`);
        }
    }

    exportJSONL() {
        if (!this.data) {
            alert("No data available to export.");
            return;
        }

        try {
            let lines;
            
            // If data is an array, export each item as a line
            if (Array.isArray(this.data)) {
                lines = this.data.map(item => JSON.stringify(item)).join('\n');
            } else {
                // If it's a single object, wrap it
                lines = JSON.stringify(this.data);
            }

            this.download(lines, "export.jsonl", "application/jsonl");
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
