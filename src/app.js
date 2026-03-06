// src/app.js
// LocalParse - Main Application Controller

import Navbar from "./components/navbar.js";
import FileLoader from "./components/fileLoader.js";
import JSONTreeViewer from "./components/jsonTreeViewer.js";
import Exporter from "./components/exporter.js";

class App {
    constructor() {
        this.data = null;
        this.fileName = "";
        this.listeners = {}; // event bus
    }

    // --------------------------
    // EVENT SYSTEM
    // --------------------------
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    emit(event, payload) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(cb => cb(payload));
    }

    // --------------------------
    // STATE MANAGEMENT
    // --------------------------
    setData(newData) {
        this.data = newData;
    }

    setFileName(name) {
        this.fileName = name;
    }

    // --------------------------
    // ERROR HANDLING
    // --------------------------
    handleError(message) {
        console.error("[App Error]", message);
        alert(message);
    }

    // --------------------------
    // INITIALIZATION
    // --------------------------
    init() {
        console.log("🚀 LocalParse - Initializing...");

        // Initialize components
        this.navbar = new Navbar(this);
        this.fileLoader = new FileLoader(this);
        this.viewer = new JSONTreeViewer(this);
        this.exporter = new Exporter(this);

        // Mount UI components
        this.navbar.mount();
        this.fileLoader.mount();
        this.viewer.mount();
        this.exporter.mount();

        // Error handler
        this.on("error", (msg) => this.handleError(msg));

        console.log("✅ Application ready!");
    }
}

// --------------------------
// BOOTSTRAP APP
// --------------------------
document.addEventListener("DOMContentLoaded", () => {
    const app = new App();
    window.LocalParseApp = app; // for debugging in browser console
    app.init();
});
