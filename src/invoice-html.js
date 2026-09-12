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
    @page { size: A4; margin: 14mm 14mm 16mm 14mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      color: #1c1c1c;
      font-family: "Calibri", "Segoe UI", Arial, sans-serif;
      font-size: 12.5px;
      line-height: 1.35;
    }
    .page { width: 100%; }
    .page-break { page-break-before: always; break-before: page; padding-top: 8px; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 22px;
    }
    .logo { height: 58px; width: auto; }
    .header-right { text-align: right; }
    .invoice-title {
      margin: 0;
      font-size: 28px;
      letter-spacing: 0.5px;
      color: #1b2c6b;
      font-weight: 800;
    }
    .invoice-kind {
      margin: 2px 0 0;
      color: #5b6578;
      font-size: 12px;
      letter-spacing: 0.6px;
      font-weight: 600;
    }
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-bottom: 16px;
    }
    .label {
      font-weight: 700;
      margin: 0 0 6px;
    }
    .muted { margin: 0; white-space: pre-wrap; }
    .meta-row { margin: 0 0 4px; }
    .bank-title {
      font-weight: 800;
      margin: 0 0 6px;
      text-transform: uppercase;
      font-size: 12.5px;
    }
    .section-title {
      color: #1d5fa8;
      font-weight: 800;
      font-size: 13.5px;
      margin: 18px 0 8px;
      text-transform: uppercase;
    }
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    table.items th {
      background: #cfe6f7;
      color: #1d3557;
      font-weight: 700;
      padding: 8px 10px;
      text-align: left;
      border: 1px solid #b9d6ec;
    }
    table.items td {
      padding: 10px;
      border: 1px solid #d5dbe3;
      vertical-align: top;
    }
    table.items td.num, table.items th.num { text-align: right; white-space: nowrap; }
    table.items td.center, table.items th.center { text-align: center; width: 48px; }
    .totals {
      width: 320px;
      margin-left: auto;
      margin-top: 12px;
    }
    .totals .row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 3px 0;
      color: #1d5fa8;
      font-weight: 700;
    }
    .totals .row.grand {
      font-size: 14px;
      margin-top: 4px;
    }
    .footer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 36px;
    }
    .sign { text-align: right; }
    .sign img { height: 42px; width: auto; display: block; margin: 0 0 4px auto; }
    .sign .line {
      border-top: 2px solid #1d5fa8;
      display: inline-block;
      min-width: 210px;
      padding-top: 4px;
      color: #1d5fa8;
      font-weight: 800;
      letter-spacing: 0.4px;
    }
    .terms h2 {
      font-size: 16px;
      margin: 0 0 12px;
    }
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
      (item, index) => `
        <tr>
          <td class="center">${index + 1}</td>
          <td>${multiline(item.description)}</td>
          <td class="num">${formatInr(item.unitPrice)}</td>
          <td class="num">${formatInr(item.lineTotal)}</td>
        </tr>`,
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
  <div class="page">
    <div class="header">
      <img class="logo" src="${logoDataUri}" alt="Introis Technologies">
      <div class="header-right">
        <h1 class="invoice-title">INVOICE</h1>
        <p class="invoice-kind">${escapeHtml(invoice.paymentKind || 'CASH / CREDIT')}</p>
      </div>
    </div>

    <div class="two-col">
      <div>
        <p class="label">From</p>
        <p class="muted"><strong>${escapeHtml(invoice.company.name)}</strong><br>
        ${multiline(invoice.company.address)}<br>
        Phone: ${escapeHtml(invoice.company.phone)}<br>
        Email: ${escapeHtml(invoice.company.email)}<br>
        GSTIN: ${escapeHtml(invoice.company.gstin)}</p>
      </div>
      <div>
        <p class="label">Bill To</p>
        <p class="muted"><strong>${escapeHtml(invoice.client.contactName)}</strong><br>
        ${escapeHtml(invoice.client.companyName)}<br>
        ${multiline(invoice.client.address)}<br>
        Email: ${escapeHtml(invoice.client.email)}<br>
        GSTIN of Recipient: ${escapeHtml(invoice.client.gstin)}</p>
      </div>
    </div>

    <div class="two-col">
      <div>
        <p class="meta-row"><strong>Invoice Number:</strong> ${escapeHtml(number)}</p>
        <p class="meta-row"><strong>Invoice Date:</strong> ${escapeHtml(formatDateDisplay(invoice.invoiceDate))}</p>
      </div>
      <div>
        <p class="bank-title">BANK DETAILS</p>
        <p class="muted">Bank Name: ${escapeHtml(invoice.bank.bankName)}<br>
        A/C Holder Name: ${escapeHtml(invoice.bank.holderName)}<br>
        Account number: ${escapeHtml(invoice.bank.accountNumber)}<br>
        Bank IFSC Code: ${escapeHtml(invoice.bank.ifsc)}<br>
        Account Type: ${escapeHtml(invoice.bank.accountType)}<br>
        Account Branch: ${escapeHtml(invoice.bank.branch)}</p>
      </div>
    </div>

    <p class="section-title">Project Overview</p>
    <p><strong>Project Name:</strong> ${escapeHtml(invoice.projectName)}</p>
    <p><strong>Duration of Project Completion:</strong> ${escapeHtml(invoice.duration)}</p>

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
  </div>

  <div class="page page-break terms">
    <h2>Terms and Conditions</h2>
    ${(invoice.terms ?? []).map((term) => `<p>${escapeHtml(term)}</p>`).join('')}
  </div>
</body>
</html>`;
}
