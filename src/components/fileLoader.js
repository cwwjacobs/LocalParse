import { parseJSON } from "../utils/parseJSON.js";

export default class FileLoader {
    constructor(app) {
        this.app = app;
        this.input = null;
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

        this.app.on("open-file-dialog", () => this.input.click());
    }

    async loadFile(file) {
        try {
            // Check file extension
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext !== 'json' && ext !== 'jsonl') {
                this.app.emit("error", "Only .json and .jsonl files are supported.");
                return;
            }

            // Read file content
            const text = await file.text();
            
            // Parse JSON/JSONL
            const result = parseJSON(text);
            
            if (!result.success) {
                this.app.emit("error", `Failed to parse file: ${result.error}`);
                return;
            }

            // Store data and notify
            this.app.setData(result.data);
            this.app.setFileName(file.name);
            this.app.emit("data-loaded", result);

        } catch (err) {
            console.error("[FileLoader] Error:", err);
            this.app.emit("error", `Failed to load file: ${err.message}`);
        }
    }
}
