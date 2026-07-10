# LocalParse showcase guide

## One-line portfolio description

LocalParse is a browser-only JSON and JSONL inspector that keeps files on the user's device. It has no backend, account, telemetry, build step, or external runtime dependency.

## Why this project belongs in a portfolio

LocalParse is a compact, understandable product with a strong privacy story:

- opens JSON and JSONL locally
- drag-and-drop and file-picker input
- expandable tree navigation
- root type, format, and item-count summaries
- export back to JSON or JSONL
- static deployment with no backend
- no analytics or uploads
- commercial licensing path

## 45-second demo

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` and:

1. drop in `sample.jsonl`
2. expand a nested record
3. show the detected format and item count
4. export the parsed data
5. disconnect the network and repeat the workflow

## Screenshot and recording shot list

Capture these views:

1. empty-state landing screen
2. JSONL file loaded with several records
3. a deeply nested object expanded
4. stats panel showing format and item count
5. export control visible
6. browser network panel showing no application uploads during file inspection

Use synthetic data only. Avoid screenshots containing customer records, credentials, or personal exports.

## Proof points to mention

- files remain in browser memory during use
- no server receives the opened file
- the app can be hosted as static files
- no dependency install or build pipeline is required
- the interface solves one narrow task without platform overhead

## Honest boundaries

LocalParse is an inspector, not a schema validator, database, collaborative editor, or secure enclave. Browser extensions and a compromised device remain outside the app's protection boundary.

## Suggested GitHub description

> Private browser-only JSON and JSONL inspector with no uploads, backend, account, telemetry, or build step.

## Suggested topics

`json` `jsonl` `javascript` `local-first` `privacy` `offline-first` `data-viewer` `static-web-app`

## Suggested pinned-repository caption

> Open structured data, inspect the tree, and export it again without sending the file anywhere.
