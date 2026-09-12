# Introis Invoice Generator

Web app for creating GST invoices for Introis Technologies.

## Features

- Sequential invoice numbers (`INTSINV099`, then `INTSINV100`, …) with a manually editable next sequence
- Client directory: add, edit, delete, and prefill Bill To
- Current or Savings bank account on each invoice (full account records in Settings)
- CGST 9% + SGST 9%
- Saved invoice history and PDF download matching the organisation layout
- **Download app** in the header: a single HTML file you can save and open later without Node. Clients, settings, and invoices are stored in that browser. Use **Download PDF** (or Print → Save as PDF in the offline file) to keep a copy of each invoice.

## Downloadable file

1. Start the app once (`npm start`) and click **Download app**, or open `/download`.
2. Save `Introis-Invoice-Generator.html` anywhere (Desktop, shared drive, email it).
3. Open that file in Chrome or Edge. No install and no terminal after that.
4. Click **Download PDF** to save an invoice. In the offline file, the browser print dialog appears — choose **Save as PDF**.

Data stays in the browser that opened the file (localStorage). Copy the HTML file to another computer if you want a fresh copy; it will not automatically sync.

## Development

```bash
npm ci
npm start
```

Open http://localhost:3000

Data is stored in `data/store.json` (created on first run). Company, bank, numbering, and terms defaults come from the sample invoice; update the savings account number under Settings.

## Tests

```bash
npm test
```
