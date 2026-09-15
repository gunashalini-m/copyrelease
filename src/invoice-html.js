import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDateDisplay, formatInr, formatInvoiceNumber } from './money.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HEADING_BLUE = '#002060';
const INVOICE_FONT = 'Aptos, "Aptos Display", Calibri, Arial, Helvetica, sans-serif';

function firstExisting(paths) {
  return paths.find((filePath) => existsSync(filePath));
}

function fontDataUri(filePath) {
  const bytes = readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.woff2' ? 'font/woff2' : 'font/ttf';
  const format = ext === '.woff2' ? 'woff2' : 'truetype';
  return { uri: `data:${mime};base64,${bytes.toString('base64')}`, format };
}

function fontFaceCss() {
  const homeFonts = path.join(os.homedir(), '.local/share/fonts');
  const regularFile = firstExisting([
    path.join(root, 'public/fonts/Aptos.woff2'),
    path.join(homeFonts, 'Aptos.ttf'),
    path.join(root, 'public/fonts/Aptos.ttf'),
  ]);
  const boldFile = firstExisting([
    path.join(root, 'public/fonts/Aptos-Bold.woff2'),
    path.join(homeFonts, 'Aptos-Bold.ttf'),
    path.join(root, 'public/fonts/Aptos-Bold.ttf'),
  ]);
  const regular = regularFile ? fontDataUri(regularFile) : null;
  const bold = boldFile ? fontDataUri(boldFile) : null;
  const regularSrc = regular
    ? `local("Aptos"), local("Aptos Regular"), url(${regular.uri}) format("${regular.format}")`
    : `local("Aptos"), local("Aptos Regular")`;
  const boldSrc = bold
    ? `local("Aptos Bold"), local("Aptos-Bold"), url(${bold.uri}) format("${bold.format}")`
    : `local("Aptos Bold"), local("Aptos-Bold")`;
  return `
    @font-face {
      font-family: Aptos;
      src: ${regularSrc};
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: Aptos;
      src: ${boldSrc};
      font-weight: 700;
      font-style: normal;
    }
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function multiline(value) {
  return escapeHtml(value).replaceAll('\n', '<br>');
}

export function invoiceStyles() {
  return `
    ${fontFaceCss()}
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      height: auto;
      color: #111111;
      font-family: ${INVOICE_FONT};
      font-size: 11pt;
      line-height: 1.15;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 0;
      padding-bottom: 15pt;
    }
    .logo {
      display: block;
      height: 52px;
      width: auto;
      max-width: 260px;
      object-fit: contain;
      object-position: left top;
    }
    .header-right { text-align: right; padding-top: 2px; }
    .invoice-title {
      margin: 0;
      font-size: 22pt;
      color: ${HEADING_BLUE};
      font-weight: 700;
      letter-spacing: 0.4px;
      line-height: 1.1;
    }
    .invoice-kind {
      margin: 1px 0 0;
      color: #666666;
      font-size: 10pt;
      letter-spacing: 0.6px;
      font-weight: 700;
    }
    .section { margin-top: 15pt; }
    .header + .section { margin-top: 0; }
    .section p { margin: 0; }
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 48px;
      row-gap: 15pt;
      align-items: start;
      margin: 0;
    }
    .label,
    .bank-title {
      font-weight: 700 !important;
      font-size: 11pt;
      margin: 0 0 1px;
      color: #111111;
    }
    .block p { margin: 0; font-size: 11pt; font-weight: 400; line-height: 1.15; }
    .block p.label,
    .block p.bank-title {
      font-weight: 700;
    }
    .block p strong, .block p b { font-weight: 700; }
    .meta-row { margin: 0; font-size: 11pt; line-height: 1.15; }
    .section-title {
      color: ${HEADING_BLUE};
      font-weight: 700;
      font-size: 11pt;
      margin: 0 0 2px;
      text-transform: uppercase;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    table.items {
      width: 100%;
      border-collapse: separate;
      border-spacing: 2px;
      background: #ffffff;
      margin-top: 0;
      table-layout: fixed;
      font-size: 11pt;
    }
    table.items col.col-no { width: 8%; }
    table.items col.col-desc { width: 54%; }
    table.items col.col-amt { width: 19%; }
    table.items th {
      background: #c7e6fa;
      color: #111111;
      font-weight: 700;
      padding: 3px 6px;
      text-align: center;
      border: none;
      font-size: 11pt;
    }
    table.items td {
      padding: 2px 6px;
      border: none;
      vertical-align: middle;
      color: #111111;
      font-weight: 400;
      background: #eef7fc;
    }
    table.items td.desc { text-align: left; }
    table.items td.num, table.items th.num { text-align: right; white-space: nowrap; }
    table.items td.center, table.items th.center { text-align: center; }
    .totals {
      width: 300px;
      margin: 2px 0 0 auto;
      border-collapse: collapse;
      font-size: 11pt;
    }
    .totals td {
      color: ${HEADING_BLUE};
      font-weight: 700;
      padding: 1px 0 1px 12px;
      vertical-align: top;
      font-size: 11pt;
    }
    .totals td.lab { text-align: right; width: 58%; }
    .totals td.amt { text-align: right; white-space: nowrap; }
    .footer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: start;
      page-break-inside: avoid;
      break-inside: avoid;
      break-after: avoid;
      page-break-after: avoid;
    }
    .section.footer-grid { margin-top: 30pt; }
    .accept .section-title {
      margin: 0;
      line-height: 1.2;
    }
    .accept-field {
      margin: 0;
      padding: 0;
      font-size: 11pt;
      font-weight: 700;
      line-height: 1.2;
    }
    .sign { text-align: right; }
    .sign img {
      height: 52px;
      width: auto;
      max-width: 230px;
      object-fit: contain;
      object-position: right bottom;
      display: block;
      margin: 0 0 2px auto;
    }
    .sign .line {
      border-top: 2px solid ${HEADING_BLUE};
      display: inline-block;
      min-width: 210px;
      padding-top: 3px;
      color: ${HEADING_BLUE};
      font-weight: 700;
      letter-spacing: 0.3px;
      font-size: 11pt;
    }
    .sign p { margin: 2px 0 0; font-size: 11pt; font-weight: 400; }
    .terms {
      text-align: left;
      margin-top: 0;
      break-before: avoid;
      page-break-before: avoid;
    }
    .terms h2 {
      font-size: 11pt;
      font-weight: 700;
      margin: 0 0 1px;
      color: #111111;
      text-align: left;
    }
    .terms p {
      margin: 0;
      max-width: none;
      font-size: 11pt;
      font-weight: 400;
      text-align: left;
      line-height: 1.2;
    }
  `;
}

export function renderInvoiceHtml(invoice, { logoDataUri, signatureDataUri }) {
  const sgstRate = invoice.sgstRate ?? 9;
  const cgstRate = invoice.cgstRate ?? 9;
  const number = formatInvoiceNumber(
    invoice.prefix,
    invoice.sequence,
    invoice.sequencePadding ?? 3,
  );
  const rows = invoice.lineItems
    .map(
      (item, index) =>
        `<tr><td class="center">${index + 1}</td><td class="desc">${multiline(item.description)}</td><td class="num">${formatInr(item.unitPrice)}</td><td class="num">${formatInr(item.lineTotal)}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(number)}</title>
  <style>${invoiceStyles()}</style>
</head>
<body>
  <div class="header">
    <img class="logo" src="${logoDataUri}" alt="Introis Technologies">
    <div class="header-right">
      <h1 class="invoice-title">INVOICE</h1>
      <p class="invoice-kind">${escapeHtml(invoice.paymentKind || 'CASH / CREDIT')}</p>
    </div>
  </div>
  <div class="section two-col">
    <div class="block">
      <p class="label"><b>From</b></p>
      <p><strong>${escapeHtml(invoice.company.name)}</strong></p>
      <p>${multiline(invoice.company.address)}</p>
      <p>Phone: ${escapeHtml(invoice.company.phone)}</p>
      <p>Email: ${escapeHtml(invoice.company.email)}</p>
      <p>GSTIN: ${escapeHtml(invoice.company.gstin)}</p>
    </div>
    <div class="block">
      <p class="label"><b>Bill To</b></p>
      <p><strong>${escapeHtml(invoice.client.contactName)}</strong></p>
      <p>${escapeHtml(invoice.client.companyName)}</p>
      <p>${multiline(invoice.client.address)}</p>
      <p>Email: ${escapeHtml(invoice.client.email)}</p>
      <p>GSTIN of Recipient: ${escapeHtml(invoice.client.gstin)}</p>
    </div>
    <div>
      <p class="meta-row"><strong>Invoice Number:</strong> ${escapeHtml(number)}</p>
      <p class="meta-row"><strong>Invoice Date:</strong> ${escapeHtml(formatDateDisplay(invoice.invoiceDate))}</p>
    </div>
    <div class="block">
      <p class="bank-title"><b>Bank Details</b></p>
      <p>Bank Name: ${escapeHtml(invoice.bank.bankName)}</p>
      <p>A/C Holder Name: ${escapeHtml(invoice.bank.holderName)}</p>
      <p>Account number: ${escapeHtml(invoice.bank.accountNumber)}</p>
      <p>Bank IFSC Code: ${escapeHtml(invoice.bank.ifsc)}</p>
      <p>Account Type: ${escapeHtml(invoice.bank.accountType)}</p>
      <p>Account Branch: ${escapeHtml(invoice.bank.branch)}</p>
    </div>
  </div>
  <div class="section">
    <p class="section-title">Project Title</p>
    <p>${escapeHtml(invoice.projectName)}</p>
  </div>
  <div class="section">
    <p class="section-title">Duration of Project Completion</p>
    <p>${escapeHtml(invoice.duration)}</p>
  </div>
  <div class="section">
  <table class="items">
    <colgroup>
      <col class="col-no">
      <col class="col-desc">
      <col class="col-amt">
      <col class="col-amt">
    </colgroup>
    <thead>
      <tr>
        <th class="center">S.No</th>
        <th>Description</th>
        <th class="num">Unit Price</th>
        <th class="num">Line Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals">
    <tr><td class="lab">Total Without<br>Taxes</td><td class="amt">${formatInr(invoice.subtotal)}</td></tr>
    <tr><td class="lab">SGST @${sgstRate}%</td><td class="amt">${formatInr(invoice.sgst)}</td></tr>
    <tr><td class="lab">CGST @${cgstRate}%</td><td class="amt">${formatInr(invoice.cgst)}</td></tr>
    <tr><td class="lab">Total Invoice<br>Value</td><td class="amt">${formatInr(invoice.total)}</td></tr>
  </table>
  </div>
  <div class="section footer-grid">
    <div class="accept">
      <p class="section-title">Client Acceptance</p>
      <p class="accept-field"><b>Client Name:</b></p>
      <p class="accept-field"><b>Date:</b></p>
      <p class="accept-field"><b>Signature:</b></p>
    </div>
    <div class="sign">
      <img src="${signatureDataUri}" alt="Authorised signature">
      <div class="line">AUTHORISED SIGNATURE</div>
      <p>Name: ${escapeHtml(invoice.signatory.name)}<br>
      Designation: ${escapeHtml(invoice.signatory.designation)}<br>
      Date: ${escapeHtml(formatDateDisplay(invoice.invoiceDate))}</p>
    </div>
  </div>
  <div class="section terms">
    <h2>Terms and Conditions</h2>
    ${(invoice.terms ?? []).map((term, index) => `<p>${index + 1}. ${escapeHtml(term)}</p>`).join('')}
  </div>
</body>
</html>`;
}
