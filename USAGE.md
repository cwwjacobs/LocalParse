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

### Strict loading and partial recovery

Loading is strict by default. A `.jsonl` file is imported only when every
nonblank line is valid JSON; blank lines are ignored. If any line fails,
the file is rejected with an error naming the exact line numbers, and
nothing from that file is imported or exported.

When some lines are valid, the sidebar shows a **Partial Import** panel
listing the skipped line numbers. Clicking **Load valid rows only** is an
explicit opt-in: only the valid lines are imported, the file name is
labeled as a partial import in the top bar, and the stats panel shows the
skipped lines. Starting a new load cancels any previous load still in
progress.

## Navigating data

- Click `▶` to expand an object or array.
- Click `▼` to collapse it.
- Expand nested levels as needed.
- Review the stats panel for detected format, root type, and item count.

## Export options

Export is only available after a file has loaded successfully.

### Export JSON
Downloads the currently loaded data as formatted JSON.

### Export JSONL
Downloads the currently loaded data as JSONL.
- If the loaded data is an array, each item is written as one line.
- If the loaded data is a single object, it is written as a single JSONL entry.

### Partial exports

Exporting data from a partial (recovery) import always produces a marked
file so it cannot be mistaken for a complete load:

- the filename becomes `export.partial.json` / `export.partial.jsonl`
- the content carries a `_localparse_partial` marker listing the exact
  skipped source lines (an envelope key for JSON, a leading metadata
  line for JSONL)

## Clearing the viewer

Click **Clear** to remove the current dataset from the interface.

## Supported file types

- `.json`
- `.jsonl`

## Troubleshooting

### The file does not load
- Confirm the file extension is `.json` or `.jsonl`.
- Read the error message: it lists the exact line numbers that failed to
  parse. Fix those lines, or use the **Partial Import** panel to load only
  the valid rows (the import and any export will be marked partial).
- Try opening the file in a text editor to inspect formatting errors.

### Export does not work
- Check whether your browser is blocking downloads.
- Confirm that a file was successfully loaded first.

### Nothing displays
- Refresh the page and try again.
- Open the browser developer console to inspect any parse errors.

## Notes

LocalParse is intentionally lightweight. It focuses on local inspection, tree navigation, and simple export rather than schema editing or heavy transformation workflows.
