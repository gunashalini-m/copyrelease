# ServiceNow ITSM Script Lab

A browser-based simulator that asks you to write ServiceNow scripts for ITSM (including Integrations), autocompletes platform APIs as you type, and grades answers instantly. You can reveal a reference solution at any time.

## Run locally

```bash
npm ci
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## What you get

- **10 ITSM topics**, each with **at least 15 coding questions**: Incident, Problem, Change, Request & Catalog, Knowledge, CMDB, Asset, SLA, Major Incident, and Integrations.
- **Monaco editor** with ServiceNow API completions (`GlideRecord`, `gs`, `g_form`, `RESTMessageV2`, Scripted REST, and more) plus common snippets.
- **Fast client-side grading** (pattern checks on your script; typically well under 10 ms per attempt).
- **Show solution** and **Copy solution into editor**.
- Progress is stored in `localStorage` (passed questions stay marked on this browser).

## Keyboard

- `Ctrl+Enter` / `Cmd+Enter` — grade the current script.

## Tests

```bash
npm test
```

Tests assert each topic has 15+ questions, every official solution passes, starters do not already pass, and a full grade pass is fast.
