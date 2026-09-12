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
      color: #111;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11.5px;
      line-height: 1.32;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .logo { height: 48px; width: auto; }
    .header-right { text-align: right; }
    .invoice-title {
      margin: 0;
      font-size: 26px;
      color: #1b2c6b;
      font-weight: 800;
      letter-spacing: 0.4px;
    }
    .invoice-kind {
      margin: 2px 0 0;
      color: #667;
      font-size: 11px;
      letter-spacing: 0.5px;
      font-weight: 700;
    }
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 36px;
      margin-bottom: 10px;
    }
    .label { font-weight: 700; margin: 0 0 4px; }
    .block p { margin: 0; }
    .meta-row { margin: 0 0 2px; }
    .bank-title {
      font-weight: 800;
      margin: 0 0 4px;
      text-transform: uppercase;
      font-size: 12px;
    }
    .section-title {
      color: #1d5fa8;
      font-weight: 800;
      font-size: 12.5px;
      margin: 12px 0 6px;
      text-transform: uppercase;
    }
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    table.items th {
      background: #cfe6f7;
      color: #1d3557;
      font-weight: 700;
      padding: 6px 8px;
      text-align: left;
      border: 1px solid #b9d6ec;
    }
    table.items td {
      padding: 7px 8px;
      border: 1px solid #d5dbe3;
      vertical-align: top;
    }
    table.items td.num, table.items th.num { text-align: right; white-space: nowrap; width: 110px; }
    table.items td.center, table.items th.center { text-align: center; width: 44px; }
    .totals { width: 280px; margin: 8px 0 0 auto; }
    .totals .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 1px 0;
      color: #1d5fa8;
      font-weight: 700;
    }
    .totals .row.grand { font-size: 13px; margin-top: 2px; }
    .footer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 20px;
      align-items: end;
    }
    .sign { text-align: right; }
    .sign img { height: 34px; width: auto; display: block; margin: 0 0 2px auto; }
    .sign .line {
      border-top: 2px solid #1d5fa8;
      display: inline-block;
      min-width: 190px;
      padding-top: 3px;
      color: #1d5fa8;
      font-weight: 800;
      letter-spacing: 0.3px;
      font-size: 11px;
    }
    .sign p { margin: 6px 0 0; }
    .page-break { page-break-before: always; break-before: page; }
    .terms h2 { font-size: 15px; margin: 0 0 10px; }
    .terms p { margin: 0 0 7px; max-width: 620px; }
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
        `<tr><td class="center">${index + 1}</td><td>${multiline(item.description)}</td><td class="num">${formatInr(item.unitPrice)}</td><td class="num">${formatInr(item.lineTotal)}</td></tr>`,
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
  <p style="margin:0 0 2px"><strong>Project Name:</strong> ${escapeHtml(invoice.projectName)}</p>
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
  <div class="totals">
    <div class="row"><span>Total Without Taxes</span><span>${formatInr(invoice.subtotal)}</span></div>
    <div class="row"><span>SGST @${invoice.sgstRate}%</span><span>${formatInr(invoice.sgst)}</span></div>
    <div class="row"><span>CGST @${invoice.cgstRate}%</span><span>${formatInr(invoice.cgst)}</span></div>
    <div class="row grand"><span>Total Invoice Value</span><span>${formatInr(invoice.total)}</span></div>
  </div>
  <div class="footer-grid">
    <div>
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
