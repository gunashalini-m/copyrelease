# ServiceNow ITSM Script Lab

A browser-based simulator that asks you to write ServiceNow scripts for ITSM (including Integrations), autocompletes platform APIs as you type, and grades answers instantly. You can reveal a reference solution at any time.

## Download (do not use Raw on the .html file)

GitHub **Raw** shows HTML as source code. Use one of these instead:

1. **Zip (recommended):** open [servicenow-itsm-lab.zip](https://github.com/gunashalini-m/copyrelease/blob/cursor/servicenow-itsm-simulator-3c42/servicenow-itsm-lab.zip) and click the download button, **or** use  
   https://github.com/gunashalini-m/copyrelease/raw/cursor/servicenow-itsm-simulator-3c42/servicenow-itsm-lab.zip  
   Unzip, then double-click `servicenow-itsm-lab.html`.

2. **HTML file page:** [servicenow-itsm-lab.html](https://github.com/gunashalini-m/copyrelease/blob/cursor/servicenow-itsm-simulator-3c42/servicenow-itsm-lab.html) → click the **Download raw file** icon (down arrow). Do **not** click **Raw**.

To rebuild the file after editing questions:

```bash
npm run build:standalone
```

## Run locally with the hosted app

```bash
npm ci
npm start
```

Open [http://localhost:3000](http://localhost:3000). Use **Download HTML file** in the sidebar to save the same standalone lab.

## What you get

- **11 practice topics**, each with the full question bank (15–20 coding labs and 15–20 theory items): Incident, Problem, Change, Request & Catalog, Knowledge, CMDB, Asset, SLA, Major Incident, Integrations, and **ACLs & Security**. Extra items that used to be sliced off at 15 are included.
- **Six timed-style exams** in the sidebar (mixed code + theory unless noted): full bank, ITSM process, developer coding-only, ACL & security, CMDB/Asset/Integrations, and theory-only.
- **Monaco editor** with ServiceNow API completions (`GlideRecord`, `GlideRecordSecure`, `gs`, `g_form`, `RESTMessageV2`, Scripted REST, and more) plus common snippets.
- **Fast client-side grading** (pattern checks on your script; typically well under 10 ms per attempt).
- **Show solution** and **Copy solution into editor**.
- Progress is stored in `localStorage` (passed questions stay marked on this browser).

## Keyboard

- `Ctrl+Enter` / `Cmd+Enter` — grade the current script.

## Tests

```bash
npm test
```

Tests assert each topic has 15+ questions, six exams resolve, every official solution passes, starters do not already pass, and a full grade pass is fast.
