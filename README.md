# Introis Invoice Generator

Web app for creating GST invoices for Introis Technologies.

## Features

- Sequential invoice numbers (`INTSINV099`, then `INTSINV100`, …) with a manually editable next sequence
- Client directory: add, edit, delete, and prefill Bill To
- Current or Savings bank account on each invoice (full account records in Settings)
- CGST 9% + SGST 9%
- Saved invoice history and PDF download matching the organisation layout

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
