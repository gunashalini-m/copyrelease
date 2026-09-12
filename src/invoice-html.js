import { formatDateDisplay, formatInr, formatInvoiceNumber } from './money.js';

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
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      color: #1a1a1a;
      font-family: Calibri, "Segoe UI", Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.38;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 18px;
    }
    .logo {
      display: block;
      height: 62px;
      width: auto;
      max-width: 280px;
      object-fit: contain;
      object-position: left top;
    }
    .header-right { text-align: right; padding-top: 2px; }
    .invoice-title {
      margin: 0;
      font-size: 28px;
      color: #1b2c6b;
      font-weight: 800;
      letter-spacing: 0.6px;
      line-height: 1.1;
    }
    .invoice-kind {
      margin: 4px 0 0;
      color: #5b6578;
      font-size: 11.5px;
      letter-spacing: 0.8px;
      font-weight: 700;
    }
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 48px;
      align-items: start;
      margin-bottom: 14px;
    }
    .label { font-weight: 700; margin: 0 0 5px; }
    .block p { margin: 0 0 1px; }
    .meta-row { margin: 0 0 3px; }
    .bank-title {
      font-weight: 800;
      margin: 0 0 5px;
      text-transform: uppercase;
      font-size: 12.5px;
    }
    .section-title {
      color: #1d5fa8;
      font-weight: 800;
      font-size: 13px;
      margin: 14px 0 6px;
      text-transform: uppercase;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      table-layout: fixed;
    }
    table.items th {
      background: #cfe6f7;
      color: #1d3557;
      font-weight: 700;
      padding: 8px 10px;
      text-align: center;
      border: 1px solid #b9d6ec;
    }
    table.items td {
      padding: 9px 10px;
      border: 1px solid #d5dbe3;
      vertical-align: middle;
    }
    table.items td.desc { text-align: left; }
    table.items td.num, table.items th.num { text-align: right; white-space: nowrap; width: 18%; }
    table.items td.center, table.items th.center { text-align: center; width: 8%; }
    .totals {
      width: 310px;
      margin: 10px 0 0 auto;
      border-collapse: collapse;
    }
    .totals td {
      color: #1d5fa8;
      font-weight: 700;
      padding: 2px 0 2px 12px;
      vertical-align: top;
    }
    .totals td.lab { text-align: right; width: 58%; }
    .totals td.amt { text-align: right; white-space: nowrap; }
    .footer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 28px;
      align-items: start;
    }
    .accept p { margin: 0 0 6px; }
    .sign { text-align: right; }
    .sign img {
      height: 56px;
      width: auto;
      max-width: 240px;
      object-fit: contain;
      object-position: right bottom;
      display: block;
      margin: 0 0 4px auto;
    }
    .sign .line {
      border-top: 2px solid #1d5fa8;
      display: inline-block;
      min-width: 220px;
      padding-top: 4px;
      color: #1d5fa8;
      font-weight: 800;
      letter-spacing: 0.4px;
      font-size: 11.5px;
    }
    .sign p { margin: 8px 0 0; }
    .page-break { page-break-before: always; break-before: page; }
    .terms h2 { font-size: 16px; margin: 0 0 12px; }
    .terms p { margin: 0 0 8px; max-width: 640px; }
  `;
}

export function renderInvoiceHtml(invoice, { logoDataUri, signatureDataUri }) {
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
  <div class="two-col">
    <div class="block">
      <p class="label">From</p>
      <p><strong>${escapeHtml(invoice.company.name)}</strong></p>
      <p>${multiline(invoice.company.address)}</p>
      <p>Phone: ${escapeHtml(invoice.company.phone)}</p>
      <p>Email: ${escapeHtml(invoice.company.email)}</p>
      <p>GSTIN: ${escapeHtml(invoice.company.gstin)}</p>
    </div>
    <div class="block">
      <p class="label">Bill To</p>
      <p><strong>${escapeHtml(invoice.client.contactName)}</strong></p>
      <p>${escapeHtml(invoice.client.companyName)}</p>
      <p>${multiline(invoice.client.address)}</p>
      <p>Email: ${escapeHtml(invoice.client.email)}</p>
      <p>GSTIN of Recipient: ${escapeHtml(invoice.client.gstin)}</p>
    </div>
  </div>
  <div class="two-col">
    <div>
      <p class="meta-row"><strong>Invoice Number:</strong> ${escapeHtml(number)}</p>
      <p class="meta-row"><strong>Invoice Date:</strong> ${escapeHtml(formatDateDisplay(invoice.invoiceDate))}</p>
    </div>
    <div class="block">
      <p class="bank-title">BANK DETAILS</p>
      <p>Bank Name: ${escapeHtml(invoice.bank.bankName)}</p>
      <p>A/C Holder Name: ${escapeHtml(invoice.bank.holderName)}</p>
      <p>Account number: ${escapeHtml(invoice.bank.accountNumber)}</p>
      <p>Bank IFSC Code: ${escapeHtml(invoice.bank.ifsc)}</p>
      <p>Account Type: ${escapeHtml(invoice.bank.accountType)}</p>
      <p>Account Branch: ${escapeHtml(invoice.bank.branch)}</p>
    </div>
  </div>
  <p class="section-title">Project Overview</p>
  <p style="margin:0 0 3px"><strong>Project Name:</strong> ${escapeHtml(invoice.projectName)}</p>
  <p style="margin:0"><strong>Duration of Project Completion:</strong> ${escapeHtml(invoice.duration)}</p>
  <table class="items">
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
    <tr><td class="lab">SGST @${invoice.sgstRate}%</td><td class="amt">${formatInr(invoice.sgst)}</td></tr>
    <tr><td class="lab">CGST @${invoice.cgstRate}%</td><td class="amt">${formatInr(invoice.cgst)}</td></tr>
    <tr><td class="lab">Total Invoice<br>Value</td><td class="amt">${formatInr(invoice.total)}</td></tr>
  </table>
  <div class="footer-grid">
    <div class="accept">
      <p class="section-title" style="margin-top:0">Client Acceptance</p>
      <p>Client Name:</p>
      <p>Date:</p>
      <p>Signature:</p>
    </div>
    <div class="sign">
      <img src="${signatureDataUri}" alt="Authorised signature">
      <div class="line">AUTHORISED SIGNATURE</div>
      <p>Name: ${escapeHtml(invoice.signatory.name)}<br>
      Designation: ${escapeHtml(invoice.signatory.designation)}<br>
      Date: ${escapeHtml(formatDateDisplay(invoice.invoiceDate))}</p>
    </div>
  </div>
  <div class="page-break terms">
    <h2>Terms and Conditions</h2>
    ${(invoice.terms ?? []).map((term) => `<p>${escapeHtml(term)}</p>`).join('')}
  </div>
</body>
</html>`;
}
