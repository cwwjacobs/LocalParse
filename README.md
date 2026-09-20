# LocalParse

**LocalParse** is a local-first browser app for opening, inspecting, and navigating **JSON** and **JSONL** files without uploading them anywhere.

It runs entirely on your device. There is no backend, no account, and no telemetry. Load a file, explore its structure in an expandable tree, review basic file stats, and export the parsed result back to JSON or JSONL.

## Why LocalParse

When you need to inspect structured data quickly, most tools either require an install, push you toward a cloud workflow, or feel heavier than the job requires. LocalParse is meant to stay simple:

- open a file
- inspect the structure
- expand nested objects and arrays
- export the parsed result
- keep the data local

## Features

- **JSON and JSONL support**
- **Local-first workflow** with no uploads
- **Drag-and-drop loading** and file picker support
- **Expandable tree viewer** for nested objects and arrays
- **Basic file stats** for format, root type, and item count
- **Export to JSON or JSONL**
- **No build step** and no external dependencies

## Supported formats

### JSON
A standard JSON object or array:

```json
{
  "name": "Alice",
  "age": 30,
  "tags": ["analysis", "review"]
}
```

### JSONL
Newline-delimited JSON where each line is a valid JSON object:

```jsonl
{"name":"Alice","age":30}
{"name":"Bob","age":25}
```

## Quick start

### Run locally

Clone the repository and serve it with any static file server:

```bash
git clone https://github.com/cwwjacobs/localparse.git
cd localparse
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

You can also use another static server, such as `npx http-server`.

## How to use

1. Click **Load File** or drag a `.json` or `.jsonl` file into the sidebar.
2. Expand and collapse nested objects or arrays in the tree view.
3. Review the detected format and item count.
4. Export the loaded data as JSON or JSONL if needed.
5. Click **Clear** to reset the viewer.

## Project structure

```text
localparse/
├── index.html
├── styles.css
├── sample.json
├── sample.jsonl
├── src/
│   ├── app.js
│   ├── components/
│   └── utils/
├── LICENSE
├── commercial_license.txt
└── USAGE.md
```

## Privacy

LocalParse is designed for private, browser-only inspection.

- No data is uploaded
- No analytics are included
- No account is required
- Files stay on your device during use

## Browser support

LocalParse works in modern browsers with ES module support, including current versions of:

- Chrome / Edge
- Firefox
- Safari

## License

This project is licensed under the **PolyForm Noncommercial License 1.0.0**.

- Personal, educational, and evaluation use are allowed under the included license.
- Commercial use requires a separate license.
- See `LICENSE` and `commercial_license.txt` for details.

## Commercial use

If you want to use LocalParse in a commercial setting, bundle it into an offering, or adapt it for client work, use the commercial licensing path in this repository.

## Status

LocalParse is suitable for lightweight public release as a static browser tool and intended to stay simple, portable, and easy to inspect.
