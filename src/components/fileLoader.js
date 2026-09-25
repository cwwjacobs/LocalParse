import { parseJSON, getPartialInfo } from "../utils/parseJSON.js";

export default class FileLoader {
    constructor(app) {
        this.app = app;
        this.input = null;
        this.abortController = null;
        this.pendingRecovery = null;
        this.recoveryPanel = null;
        this.recoveryInfo = null;
    }

    mount() {
        // Create file input
        this.input = document.getElementById("file-input");
        const loadBtn = document.getElementById("load-btn");

        if (!this.input || !loadBtn) {
            console.error("[FileLoader] Required elements not found.");
            return;
        }

        // Click button to open file dialog
        loadBtn.addEventListener("click", () => this.input.click());

        // Handle file selection
        this.input.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) this.loadFile(file);
        });

        // Handle drag and drop on sidebar
        const sidebar = document.getElementById("sidebar");
        if (sidebar) {
            sidebar.addEventListener("dragover", (e) => {
                e.preventDefault();
                sidebar.style.background = "#1a1a20";
            });

            sidebar.addEventListener("dragleave", () => {
                sidebar.style.background = "";
            });

            sidebar.addEventListener("drop", (e) => {
                e.preventDefault();
                sidebar.style.background = "";
                const file = e.dataTransfer.files[0];
                if (file) this.loadFile(file);
            });
        }

        // Explicit recovery opt-in: only reachable after a strict load
        // rejected a partially-valid file.
        this.recoveryPanel = document.getElementById("recovery-panel");
        this.recoveryInfo = document.getElementById("recovery-info");
        const recoveryBtn = document.getElementById("recovery-load-btn");
        if (recoveryBtn) {
            recoveryBtn.addEventListener("click", () => this.loadPendingRecovery());
        }

        this.app.on("open-file-dialog", () => this.input.click());
        this.app.on("partial-available", (info) => this.showRecoveryPanel(info));
        this.app.on("data-loaded", () => this.hideRecoveryPanel());
        this.app.on("clear-all", () => this.hideRecoveryPanel());
    }

    async loadFile(file, options = {}) {
        const mode = options.mode === "recovery" ? "recovery" : "strict";

        try {
            // Check file extension
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext !== 'json' && ext !== 'jsonl') {
                this.app.emit("error", "Only .json and .jsonl files are supported.");
                return;
            }

            // A new load supersedes any parse still in flight; the stale
            // parse aborts and produces no events.
            if (this.abortController) this.abortController.abort();
            const controller = new AbortController();
            this.abortController = controller;

            // Read file content
            const text = await file.text();

            // Parse JSON/JSONL (strict contract: success means zero errors)
            const result = parseJSON(text, { signal: controller.signal, format: ext });

            if (result.aborted) {
                // Superseded by a newer load; never surface as success.
                return;
            }

            if (result.success) {
                this.pendingRecovery = null;
                this.app.setData(result.data, null);
                this.app.setFileName(file.name);
                this.app.emit("data-loaded", result);
                return;
            }

            if (mode === "recovery" && result.partial) {
                // Explicit opt-in recovery: import valid rows only and label
                // the dataset partial so exports are marked.
                const partialInfo = getPartialInfo(result);
                this.pendingRecovery = null;
                this.app.setData(result.data, partialInfo);
                this.app.setFileName(file.name);
                this.app.emit("data-loaded", { ...result, partialInfo });
                return;
            }

            // Strict rejection: nothing is imported, so the rejected content
            // can never reach the viewer or the exporter.
            if (result.partial) {
                this.pendingRecovery = { file };
                this.app.emit("partial-available", { fileName: file.name, result });
                this.app.emit("error",
                    `${file.name}: ${result.error}. Strict mode rejected the ` +
                    `file; no rows were imported. To load only the ` +
                    `${result.validRows} valid row(s), use "Load valid rows ` +
                    `only" - the import and any export will be marked partial.`);
            } else {
                this.pendingRecovery = null;
                this.app.emit("error", `${file.name}: ${result.error}. No rows were imported.`);
            }

        } catch (err) {
            console.error("[FileLoader] Error:", err);
            this.app.emit("error", `Failed to load file: ${err.message}`);
        }
    }

    loadPendingRecovery() {
        if (!this.pendingRecovery) return;
        const { file } = this.pendingRecovery;
        this.loadFile(file, { mode: "recovery" });
    }

    showRecoveryPanel({ fileName, result }) {
        if (!this.recoveryPanel || !this.recoveryInfo) return;
        const lines = result.errors.map(e => e.line);
        const shown = lines.slice(0, 20).join(", ");
        const more = lines.length > 20 ? `, ... (+${lines.length - 20} more)` : "";
        this.recoveryInfo.textContent =
            `${fileName}: ${result.validRows} of ${result.totalRows} rows are valid. ` +
            `Skipped line${lines.length === 1 ? "" : "s"}: ${shown}${more}. ` +
            `Loading valid rows only is a partial import; exports will be marked partial.`;
        this.recoveryPanel.hidden = false;
    }

    hideRecoveryPanel() {
        if (this.recoveryPanel) this.recoveryPanel.hidden = true;
    }
}
