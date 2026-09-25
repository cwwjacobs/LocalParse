# UKSL review repair

## Map

Source: https://terminusprotocol.io; operating loop requested by Corey: map, execute, audit, then push/start CI on success.

Goal: Select the parser using the file extension; malformed JSON documents must never offer partial JSONL recovery.

Plan: Pass json/jsonl format from FileLoader; preserve auto detection for callers without a format. Test rejection of malformed pretty JSON in strict and recovery modes, and JSONL row shape.

Scope: this PR only. Sub-agent status YELLOW; root audits changes and owns push. No merge authorization inferred.

## Execute

FileLoader now selects json/jsonl from the normalized extension. Explicit JSON never falls back to line parsing; direct utility callers retain auto mode. Five regressions cover malformed pretty JSON in strict/recovery modes, multi-document JSON rejection, and one-row JSONL shape.

## Audit

npm test: 60 tests passed, zero failed or skipped. git diff --check passed. Root review and push pending.

Base PR head: 5840e21ca682f705bd3f0ef2d97688b01a6f4dbc; target branch: uksl/ksl-02-strict-import.
