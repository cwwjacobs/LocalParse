# LocalParse Usage Guide

## Overview

LocalParse is a static browser app for exploring JSON and JSONL files locally. It is best used when you want to inspect structured data quickly without sending that data to a server.

## Running the app

Serve the repository with a simple static server:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Loading a file

You can load a file in two ways:

### File picker
1. Click **Load File** in the top bar or **Choose File** in the sidebar.
2. Select a `.json` or `.jsonl` file.

### Drag and drop
1. Drag a `.json` or `.jsonl` file into the sidebar.
2. Drop it to load and parse the file.

## Navigating data

- Click `▶` to expand an object or array.
- Click `▼` to collapse it.
- Expand nested levels as needed.
- Review the stats panel for detected format, root type, and item count.

## Export options

### Export JSON
Downloads the currently loaded data as formatted JSON.

### Export JSONL
Downloads the currently loaded data as JSONL.
- If the loaded data is an array, each item is written as one line.
- If the loaded data is a single object, it is written as a single JSONL entry.

## Clearing the viewer

Click **Clear** to remove the current dataset from the interface.

## Supported file types

- `.json`
- `.jsonl`

## Troubleshooting

### The file does not load
- Confirm the file extension is `.json` or `.jsonl`.
- Confirm the file content is valid JSON or JSONL.
- Try opening the file in a text editor to inspect formatting errors.

### Export does not work
- Check whether your browser is blocking downloads.
- Confirm that a file was successfully loaded first.

### Nothing displays
- Refresh the page and try again.
- Open the browser developer console to inspect any parse errors.

## Notes

LocalParse is intentionally lightweight. It focuses on local inspection, tree navigation, and simple export rather than schema editing or heavy transformation workflows.
