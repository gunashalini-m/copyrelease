const views = {
  create: document.getElementById('view-create'),
  history: document.getElementById('view-history'),
  clients: document.getElementById('view-clients'),
  settings: document.getElementById('view-settings'),
};

let settings = null;
let clients = [];

function toast(message, ms = 2400) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.hidden = false;
  setTimeout(() => {
    el.hidden = true;
  }, ms);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 204) {
    return null;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

function formatInr(value) {
  const amount = Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  const [whole, fraction] = Math.abs(amount).toFixed(2).split('.');
  const lastThree = whole.slice(-3);
  const other = whole.slice(0, -3);
  const grouped = other ? `${other.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}` : lastThree;
  return `₹${grouped}.${fraction}`;
}

function formatDateDisplay(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = String(isoDate).split('-');
  if (!day) return isoDate;
  return `${day}/${month}/${year}`;
}

function invoiceNumber(sequence = Number(document.getElementById('sequence').value)) {
  const pad = settings?.sequencePadding ?? 3;
  const width = Math.max(pad, String(sequence).length);
  return `${settings?.invoicePrefix ?? 'INTSINV'}${String(sequence).padStart(width, '0')}`;
}

function showView(name) {
  Object.entries(views).forEach(([key, node]) => {
    node.classList.toggle('hidden', key !== name);
  });
  document.querySelectorAll('nav button').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === name);
  });
}

function bankFields(prefix, bank) {
  return `
    <label>Bank name <input name="${prefix}-bankName" value="${bank.bankName ?? ''}"></label>
    <label>A/C holder <input name="${prefix}-holderName" value="${bank.holderName ?? ''}"></label>
    <label>Account number <input name="${prefix}-accountNumber" value="${bank.accountNumber ?? ''}"></label>
    <label>IFSC <input name="${prefix}-ifsc" value="${bank.ifsc ?? ''}"></label>
    <label>Branch <input name="${prefix}-branch" value="${bank.branch ?? ''}"></label>
  `;
}

function readBank(prefix) {
  const form = document.getElementById('settings-form');
  const value = (name) => form.querySelector(`[name="${prefix}-${name}"]`).value;
  return {
    bankName: value('bankName'),
    holderName: value('holderName'),
    accountNumber: value('accountNumber'),
    ifsc: value('ifsc'),
    branch: value('branch'),
    accountType: prefix === 'current' ? 'Current' : 'Savings',
  };
}

function fillSettingsForm() {
  document.getElementById('s-prefix').value = settings.invoicePrefix;
  document.getElementById('s-next').value = settings.nextSequence;
  document.getElementById('s-pad').value = settings.sequencePadding;
  document.getElementById('s-name').value = settings.company.name;
  document.getElementById('s-gstin').value = settings.company.gstin;
  document.getElementById('s-address').value = settings.company.address;
  document.getElementById('s-phone').value = settings.company.phone;
  document.getElementById('s-email').value = settings.company.email;
  document.getElementById('s-sign-name').value = settings.signatory.name;
  document.getElementById('s-sign-role').value = settings.signatory.designation;
  document.getElementById('s-terms').value = (settings.terms ?? []).join('\n');
  document.getElementById('bank-current').innerHTML = bankFields('current', settings.banks.current);
  document.getElementById('bank-savings').innerHTML = bankFields('savings', settings.banks.savings);
}

function populateClients() {
  const select = document.getElementById('client-select');
  const current = select.value;
  select.innerHTML = `<option value="">Select a client</option>${clients
    .map((client) => `<option value="${client.id}">${client.companyName} — ${client.contactName}</option>`)
    .join('')}`;
  select.value = current;
  document.getElementById('client-list').innerHTML = clients
    .map(
      (client) => `
        <article class="card">
          <h3>${client.companyName}</h3>
          <p>${client.contactName}\n${client.email || ''}\n${client.gstin || ''}</p>
          <button type="button" data-edit="${client.id}">Edit</button>
          <button type="button" class="ghost" data-delete="${client.id}">Delete</button>
        </article>`,
    )
    .join('');
}

function applyClient(client) {
  document.getElementById('client-contact').value = client?.contactName ?? '';
  document.getElementById('client-company').value = client?.companyName ?? '';
  document.getElementById('client-address').value = client?.address ?? '';
  document.getElementById('client-email').value = client?.email ?? '';
  document.getElementById('client-gstin').value = client?.gstin ?? '';
}

function addItem(item = { description: '', quantity: 1, unitPrice: 0 }) {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <label>Description <textarea class="desc" rows="3" placeholder="Press Enter for a new line"></textarea></label>
    <label>Qty <input class="qty" type="number" min="0" step="1" value="${item.quantity ?? 1}"></label>
    <label>Unit price <input class="price" type="number" min="0" step="0.01" value="${item.unitPrice ?? 0}"></label>
    <button type="button" class="ghost remove" aria-label="Remove item">×</button>
  `;
  row.querySelector('.desc').value = item.description ?? '';
  row.querySelector('.remove').addEventListener('click', () => {
    row.remove();
    refreshPreview();
  });
  row.querySelectorAll('input, textarea').forEach((input) => input.addEventListener('input', refreshPreview));
  document.getElementById('items').append(row);
}

function lineItems() {
  return [...document.querySelectorAll('#items .item-row')].map((row) => ({
    description: row.querySelector('.desc').value,
    quantity: Number(row.querySelector('.qty').value || 0),
    unitPrice: Number(row.querySelector('.price').value || 0),
  }));
}

function addCustomField(field = { label: '', value: '' }) {
  const row = document.createElement('div');
  row.className = 'custom-row';
  row.innerHTML = `
    <label>Label <input class="custom-label" placeholder="e.g. PO number"></label>
    <label>Value <textarea class="custom-value" rows="2"></textarea></label>
    <button type="button" class="ghost remove" aria-label="Remove field">×</button>
  `;
  row.querySelector('.custom-label').value = field.label ?? '';
  row.querySelector('.custom-value').value = field.value ?? '';
  row.querySelector('.remove').addEventListener('click', () => {
    row.remove();
    refreshPreview();
  });
  row.querySelectorAll('input, textarea').forEach((input) => input.addEventListener('input', refreshPreview));
  document.getElementById('custom-fields').append(row);
}

function customFields() {
  return [...document.querySelectorAll('#custom-fields .custom-row')].map((row) => ({
    label: row.querySelector('.custom-label').value,
    value: row.querySelector('.custom-value').value,
  }));
}

function readLayout() {
  return {
    fontSize: Number(document.getElementById('layout-font').value),
    descWidth: Number(document.getElementById('layout-desc').value),
    compact: document.getElementById('layout-compact').value === 'compact',
    termsOnNewPage: document.getElementById('layout-terms').value === 'new',
    showCompanyGstin: document.getElementById('layout-company-gstin').checked,
    showRecipientGstin: document.getElementById('layout-recipient-gstin').checked,
    showAccountType: document.getElementById('layout-account-type').checked,
    showBankBranch: document.getElementById('layout-bank-branch').checked,
  };
}

function applyLayout(layout = {}) {
  document.getElementById('layout-font').value = String(layout.fontSize || 11);
  document.getElementById('layout-desc').value = String(layout.descWidth || 54);
  document.getElementById('layout-compact').value = layout.compact === false ? 'comfortable' : 'compact';
  document.getElementById('layout-terms').value = layout.termsOnNewPage ? 'new' : 'same';
  document.getElementById('layout-company-gstin').checked = layout.showCompanyGstin !== false;
  document.getElementById('layout-recipient-gstin').checked = layout.showRecipientGstin !== false;
  document.getElementById('layout-account-type').checked = layout.showAccountType !== false;
  document.getElementById('layout-bank-branch').checked = layout.showBankBranch !== false;
}

function formPayload() {
  return {
    sequence: Number(document.getElementById('sequence').value),
    invoiceDate: document.getElementById('invoice-date').value,
    paymentKind: document.getElementById('payment-kind').value,
    accountType: document.getElementById('account-type').value,
    projectName: document.getElementById('project-name').value,
    duration: document.getElementById('duration').value,
    customFields: customFields(),
    layout: readLayout(),
    client: {
      id: document.getElementById('client-select').value || null,
      contactName: document.getElementById('client-contact').value,
      companyName: document.getElementById('client-company').value,
      address: document.getElementById('client-address').value,
      email: document.getElementById('client-email').value,
      gstin: document.getElementById('client-gstin').value,
    },
    lineItems: lineItems(),
  };
}

function updateBankSummary() {
  const type = document.getElementById('account-type').value;
  const bank = settings.banks[type];
  const gstNote =
    type === 'savings'
      ? 'Non-GST invoice — SGST and CGST default to ₹0.00'
      : 'GST invoice — SGST 9% + CGST 9%';
  document.getElementById('bank-summary').textContent = bank
    ? `${bank.accountType} · ${bank.bankName}\n${bank.holderName} · ${bank.accountNumber || '(add account number in Settings)'}\nIFSC ${bank.ifsc} · ${bank.branch}\n${gstNote}`
    : gstNote;
}

function updateNumberFields() {
  document.getElementById('invoice-number').value = invoiceNumber();
  document.getElementById('next-number-label').textContent = invoiceNumber(settings.nextSequence);
}

async function refreshPreview() {
  if (!settings) {
    return;
  }
  updateNumberFields();
  updateBankSummary();
  const items = lineItems();
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const gst = document.getElementById('account-type').value !== 'savings';
  const rate = gst ? 0.09 : 0;
  const sgst = Math.round(subtotal * rate * 100) / 100;
  const cgst = Math.round(subtotal * rate * 100) / 100;
  const rateLabel = gst ? '9%' : '0%';
  document.getElementById('totals').innerHTML = `
    ${gst ? 'GST invoice' : 'Non-GST invoice'}<br>
    Total without taxes ${formatInr(subtotal)}<br>
    SGST @${rateLabel} ${formatInr(sgst)} · CGST @${rateLabel} ${formatInr(cgst)}<br>
    Total invoice value ${formatInr(subtotal + sgst + cgst)}
  `;

  try {
    const invoice = await api('/api/invoices/preview', { method: 'POST', body: formPayload() });
    document.getElementById('live-preview').srcdoc = previewSrcDoc(invoice);
  } catch {
    // incomplete form is expected while typing
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function invoiceFontFaceCss(embedFiles) {
  const localRegular = 'local("Aptos"), local("Aptos Regular")';
  const localBold = 'local("Aptos Bold"), local("Aptos-Bold")';
  if (!embedFiles) {
    return `
      @font-face { font-family: Aptos; src: ${localRegular}; font-weight: 400; font-display: swap; }
      @font-face { font-family: Aptos; src: ${localBold}; font-weight: 700; font-display: swap; }
    `;
  }
  const regular =
    window.__ASSETS?.fonts?.regular ||
    (location.protocol === 'file:' ? 'fonts/Aptos.woff2' : '/fonts/Aptos.woff2');
  const bold =
    window.__ASSETS?.fonts?.bold ||
    (location.protocol === 'file:' ? 'fonts/Aptos-Bold.woff2' : '/fonts/Aptos-Bold.woff2');
  return `
    @font-face { font-family: Aptos; src: ${localRegular}, url("${regular}") format("woff2"); font-weight: 400; font-display: swap; }
    @font-face { font-family: Aptos; src: ${localBold}, url("${bold}") format("woff2"); font-weight: 700; font-display: swap; }
  `;
}

function invoiceDocumentHtml(invoice, options = {}) {
  const embedFonts = options.embedFonts !== false;
  const logo = window.__ASSETS?.logo || 'assets/logo.png';
  const signature = window.__ASSETS?.signature || 'assets/signature.png';
  const layout = invoice.layout || {};
  const fontSize = Number(layout.fontSize) || 11;
  const compact = layout.compact !== false;
  const descWidth = Number(layout.descWidth) || 54;
  const amtWidth = (100 - 8 - descWidth) / 2;
  const termsOnNewPage = Boolean(layout.termsOnNewPage);
  const showCompanyGstin = layout.showCompanyGstin !== false;
  const showRecipientGstin = layout.showRecipientGstin !== false;
  const showAccountType = layout.showAccountType !== false;
  const showBankBranch = layout.showBankBranch !== false;
  const sgstRate = invoice.sgstRate ?? 9;
  const cgstRate = invoice.cgstRate ?? 9;
  const rows = invoice.lineItems
    .map(
      (item, index) =>
        `<tr><td class="center">${index + 1}</td><td class="desc">${escapeHtml(item.description).replaceAll('\n', '<br>')}</td><td class="num">${formatInr(item.unitPrice)}</td><td class="num">${formatInr(item.lineTotal)}</td></tr>`,
    )
    .join('');
  const customFieldsHtml = (invoice.customFields || [])
    .filter((field) => field.label || field.value)
    .map(
      (field) =>
        `<p><strong>${escapeHtml(field.label)}${field.label ? ':' : ''}</strong> ${escapeHtml(field.value).replaceAll('\n', '<br>')}</p>`,
    )
    .join('');
  const address = (value) => escapeHtml(value).replaceAll('\n', '<br>');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(invoice.number)}</title>
    <style>
      ${invoiceFontFaceCss(embedFonts)}
      @page { size: A4; margin: 12mm; }
      @media print {
        html, body { background: #fff !important; color: #111 !important; margin: 0 !important; padding: 0 !important; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
        body, p, td, th, h1, h2, div { color: inherit; }
      }
      html, body{margin:0;padding:0}
      body{font-family:Aptos,"Aptos Display",Calibri,Arial,sans-serif;color:#111;font-size:${fontSize}pt;line-height:${compact ? 1.25 : 1.35}}
      p{margin:0;font-size:${fontSize}pt}
      .head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:${compact ? 6 : 10}px}
      img.logo{height:52px;width:auto;max-width:260px;object-fit:contain;object-position:left top;display:block}
      h1{color:#002060;margin:0;font-size:22pt;font-weight:700}
      .kind{color:#666;font-size:10pt;font-weight:700;letter-spacing:0.6px;margin-top:3px}
      .grid{display:grid;grid-template-columns:1fr 1fr;column-gap:48px;row-gap:0;margin:${compact ? 6 : 8}px 0;align-items:start}
      table.items{width:100%;border-collapse:separate;border-spacing:2px;background:#fff;table-layout:fixed;font-size:${fontSize}pt;margin-top:6px}
      table.items col.col-no{width:8%}
      table.items col.col-desc{width:${descWidth}%}
      table.items col.col-amt{width:${amtWidth}%}
      table.items th{background:#c7e6fa;text-align:center;color:#111;font-weight:700;border:none;padding:5px 8px}
      table.items td{background:#eef7fc;font-weight:400;border:none;padding:${compact ? 4 : 6}px 8px;vertical-align:middle}
      table.items td.desc{text-align:left}
      table.items td.num, table.items th.num{text-align:right;white-space:nowrap}
      table.items td.center, table.items th.center{text-align:center}
      .blue{color:#002060;font-weight:700;text-decoration:underline;text-underline-offset:2px;font-size:${fontSize}pt;margin:${compact ? 6 : 10}px 0 4px}
      .totals{width:300px;margin:4px 0 0 auto;border-collapse:collapse}
      .totals td{color:#002060;font-weight:700;text-align:right;padding:1px 0 1px 12px;vertical-align:top;font-size:${fontSize}pt}
      .sign{text-align:right}
      .sign img{height:52px;width:auto;max-width:230px;object-fit:contain;display:block;margin:0 0 4px auto}
      .line{border-top:2px solid #002060;display:inline-block;min-width:210px;padding-top:3px;color:#002060;font-weight:700;font-size:${fontSize}pt}
      .footer{display:grid;grid-template-columns:1fr 1fr;column-gap:48px;margin-top:${compact ? 8 : 12}px;align-items:start;page-break-inside:avoid;break-inside:avoid}
      .page-break{page-break-before:always}
      .terms{text-align:left;margin-top:${termsOnNewPage ? 0 : 14}px}
      .terms h2{font-size:${fontSize}pt;font-weight:700;margin:0 0 2px;color:#111;text-align:left}
      .terms p{margin:0;font-size:${fontSize}pt;font-weight:400;text-align:left;line-height:1.3;max-width:none}
      .heading{font-weight:700;font-size:${fontSize}pt;margin:0 0 2px}
      .accept .blue{margin:0;line-height:1.3}
      .accept-field{margin:0;padding:0;font-size:${fontSize}pt;font-weight:700;line-height:1.3}
      td { font-size: ${fontSize}pt; }
    </style></head><body>
    <div class="head"><img class="logo" src="${logo}" alt="Introis Technologies"><div style="text-align:right"><h1>INVOICE</h1><div class="kind">${escapeHtml(invoice.paymentKind)}</div></div></div>
    <div class="grid">
      <div><p class="heading"><b>From</b></p>${escapeHtml(invoice.company.name)}<br>${address(invoice.company.address)}<br>Phone: ${escapeHtml(invoice.company.phone)}<br>Email: ${escapeHtml(invoice.company.email)}${showCompanyGstin ? `<br>GSTIN: ${escapeHtml(invoice.company.gstin)}` : ''}</div>
      <div><p class="heading"><b>Bill To</b></p>${escapeHtml(invoice.client.contactName)}<br>${escapeHtml(invoice.client.companyName)}<br>${address(invoice.client.address)}<br>Email: ${escapeHtml(invoice.client.email)}${showRecipientGstin ? `<br>GSTIN of Recipient: ${escapeHtml(invoice.client.gstin)}` : ''}</div>
    </div>
    <div class="grid">
      <div><strong>Invoice Number:</strong> ${escapeHtml(invoice.number)}<br><strong>Invoice Date:</strong> ${escapeHtml(formatDateDisplay(invoice.invoiceDate))}</div>
      <div><p class="heading"><b>Bank Details</b></p>Bank Name: ${escapeHtml(invoice.bank.bankName)}<br>A/C Holder Name: ${escapeHtml(invoice.bank.holderName)}<br>Account number: ${escapeHtml(invoice.bank.accountNumber)}<br>Bank IFSC Code: ${escapeHtml(invoice.bank.ifsc)}${showAccountType ? `<br>Account Type: ${escapeHtml(invoice.bank.accountType)}` : ''}${showBankBranch ? `<br>Account Branch: ${escapeHtml(invoice.bank.branch)}` : ''}</div>
    </div>
    <p class="blue">PROJECT OVERVIEW</p>
    <p><strong>Project Name:</strong> ${escapeHtml(invoice.projectName)}<br><strong>Duration of Project Completion:</strong> ${escapeHtml(invoice.duration)}</p>
    ${customFieldsHtml}
    <table class="items"><colgroup><col class="col-no"><col class="col-desc"><col class="col-amt"><col class="col-amt"></colgroup><thead><tr><th class="center">S.No</th><th>Description</th><th class="num">Unit Price</th><th class="num">Line Total</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="totals">
      <tr><td>Total Without<br>Taxes</td><td>${formatInr(invoice.subtotal)}</td></tr>
      <tr><td>SGST @${sgstRate}%</td><td>${formatInr(invoice.sgst)}</td></tr>
      <tr><td>CGST @${cgstRate}%</td><td>${formatInr(invoice.cgst)}</td></tr>
      <tr><td>Total Invoice<br>Value</td><td>${formatInr(invoice.total)}</td></tr>
    </table>
    <div class="footer">
      <div class="accept"><p class="blue">CLIENT ACCEPTANCE</p><p class="accept-field"><b>Client Name:</b></p><p class="accept-field"><b>Date:</b></p><p class="accept-field"><b>Signature:</b></p></div>
      <div class="sign"><img src="${signature}" alt="Authorised signature"><div class="line">AUTHORISED SIGNATURE</div><p>Name: ${escapeHtml(invoice.signatory.name)}<br>Designation: ${escapeHtml(invoice.signatory.designation)}<br>Date: ${escapeHtml(formatDateDisplay(invoice.invoiceDate))}</p></div>
    </div>
    <div class="${termsOnNewPage ? 'page-break terms' : 'terms'}"><h2>Terms and Conditions</h2>${(invoice.terms || []).map((term) => `<p>${escapeHtml(term)}</p>`).join('')}</div>
  </body></html>`;
}

function previewSrcDoc(invoice) {
  return invoiceDocumentHtml(invoice);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getJsPdf() {
  return window.jspdf?.jsPDF || window.jsPDF;
}

function canvasToDataUrl(canvas) {
  try {
    return { data: canvas.toDataURL('image/jpeg', 0.92), format: 'JPEG' };
  } catch (error) {
    return { data: canvas.toDataURL('image/png'), format: 'PNG' };
  }
}

function addCanvasToPdf(pdf, canvas, addPageFirst) {
  const margin = 12;
  const maxW = 210 - margin * 2;
  const maxH = 297 - margin * 2;
  const width = maxW;
  const height = (canvas.height * maxW) / canvas.width;
  const { data, format } = canvasToDataUrl(canvas);
  if (addPageFirst) pdf.addPage();
  if (height <= maxH) {
    pdf.addImage(data, format, margin, margin, width, height);
    return;
  }
  let offset = 0;
  let firstSlice = true;
  while (offset < height - 0.2) {
    if (!firstSlice) pdf.addPage();
    pdf.addImage(data, format, margin, margin - offset, width, height);
    offset += maxH;
    firstSlice = false;
  }
}

async function captureElement(element) {
  const options = {
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    imageTimeout: 20000,
    scale: 2,
    windowWidth: Math.max(element.scrollWidth, 794),
  };
  try {
    return await html2canvas(element, options);
  } catch (error) {
    return await html2canvas(element, { ...options, scale: 1 });
  }
}

async function waitForFrame(frame) {
  if (frame.contentDocument?.readyState === 'complete' && frame.contentDocument.body?.children.length) {
    return;
  }
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out preparing the invoice')), 20000);
    frame.addEventListener(
      'load',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

async function downloadInvoicePdf(invoice, filename) {
  const JsPDF = getJsPdf();
  if (typeof html2canvas !== 'function' || !JsPDF) {
    throw new Error('Could not prepare the PDF download. Reload the page and try again.');
  }
  if (!invoice?.lineItems?.length) {
    throw new Error('Add at least one line item before downloading the PDF');
  }

  const html = invoiceDocumentHtml(invoice, { embedFonts: true });
  const frame = document.createElement('iframe');
  frame.title = 'Invoice PDF';
  frame.style.cssText =
    'position:fixed;left:0;top:0;width:794px;height:1123px;border:0;background:#fff;opacity:0.01;z-index:1;pointer-events:none;';
  document.body.append(frame);
  const loadWait = waitForFrame(frame);
  frame.srcdoc = html;

  try {
    await loadWait;
    const doc = frame.contentDocument;
    if (!doc?.body) {
      throw new Error('Could not open the invoice for PDF export');
    }
    try {
      if (doc.fonts?.ready) await doc.fonts.ready;
    } catch (error) {}
    await Promise.all(
      [...doc.images].map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve())),
    );
    doc.body.style.boxSizing = 'border-box';
    doc.body.style.width = '794px';
    doc.body.style.margin = '0';
    doc.body.style.padding = '45px';
    doc.body.style.background = '#fff';

    const termsOnNewPage = Boolean(invoice.layout?.termsOnNewPage);
    const terms = doc.querySelector('.terms');
    if (termsOnNewPage && terms) terms.style.display = 'none';
    const page1 = await captureElement(doc.body);
    const pdf = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
    addCanvasToPdf(pdf, page1, false);

    if (termsOnNewPage && terms) {
      [...doc.body.children].forEach((node) => {
        if (node !== terms) node.style.display = 'none';
      });
      terms.style.display = 'block';
      const page2 = await captureElement(doc.body);
      addCanvasToPdf(pdf, page2, true);
    }
    triggerDownload(pdf.output('blob'), filename);
  } catch (error) {
    const detail = error && error.message ? error.message : 'Unknown error';
    throw new Error(`Could not download the PDF (${detail})`);
  } finally {
    frame.remove();
  }
}

async function consumePdfResponse(response, filename) {
  const type = response.headers.get('content-type') || '';
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Could not build PDF');
  }
  if (type.includes('application/json')) {
    const data = await response.json();
    if (data.print && data.invoice) {
      await downloadInvoicePdf(data.invoice, filename);
      return;
    }
    throw new Error(data.error || 'Could not build PDF');
  }
  triggerDownload(await response.blob(), filename);
}

function downloadWord(invoice) {
  const inner = invoiceDocumentHtml(invoice);
  const word = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">${inner.replace('<!DOCTYPE html><html>', '').replace('</html>', '')}</html>`;
  triggerDownload(
    new Blob(['\ufeff', word], { type: 'application/msword' }),
    `${invoice.number}.doc`,
  );
}

async function downloadCurrentPdf() {
  const preview = await api('/api/invoices/preview', { method: 'POST', body: formPayload() });
  if (window.STANDALONE) {
    await downloadInvoicePdf(preview, `${preview.number}.pdf`);
    return;
  }
  const response = await fetch('/api/invoices/preview.pdf', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(formPayload()),
  });
  await consumePdfResponse(response, `${preview.number}.pdf`);
}

async function downloadSavedPdf(id, name) {
  const response = await fetch(`/api/invoices/${id}/pdf`);
  await consumePdfResponse(response, `${name || 'invoice'}.pdf`);
}

async function loadInvoices() {
  const invoices = await api('/api/invoices');
  document.getElementById('invoice-rows').innerHTML = invoices
    .map(
      (invoice) => `
        <tr>
          <td>${invoice.number}</td>
          <td>${invoice.invoiceDate}</td>
          <td>${invoice.client.companyName}</td>
          <td>${invoice.bank.accountType}${invoice.taxMode === 'non-gst' ? ' · Non-GST' : ' · GST'}</td>
          <td>${formatInr(invoice.total)}</td>
          <td>
            <button type="button" class="ghost" data-pdf="${invoice.id}" data-name="${invoice.number}">Download PDF</button>
            · <button type="button" class="ghost" data-word="${invoice.id}">Word</button>
            · <button type="button" class="ghost" data-reuse="${invoice.id}">Reuse</button>
          </td>
        </tr>`,
    )
    .join('');
}

function loadSample() {
  const client = clients[0];
  if (client) {
    document.getElementById('client-select').value = client.id;
    applyClient(client);
  }
  document.getElementById('payment-kind').value = 'CASH / CREDIT';
  document.getElementById('account-type').value = 'current';
  document.getElementById('project-name').value = 'Pukra Hospitals - Social Media Management';
  document.getElementById('duration').value = 'April 2026 (20th to 30th Apr 2026) - Monthly Retainer';
  document.getElementById('items').innerHTML = '';
  addItem({ description: 'Service Charges for above mentioned duration', quantity: 1, unitPrice: 9167 });
  addItem({
    description: 'Posters & Carousels design (5 posters and 1 carousel)',
    quantity: 1,
    unitPrice: 2550,
  });
  addItem({
    description: 'Meta Advertisement Posting Charges\n(Facebook & Instagram Handles)',
    quantity: 1,
    unitPrice: 3000,
  });
  refreshPreview();
}

document.querySelectorAll('nav button').forEach((button) => {
  button.addEventListener('click', async () => {
    showView(button.dataset.view);
    if (button.dataset.view === 'history') {
      await loadInvoices();
    }
    if (button.dataset.view === 'settings') {
      settings = await api('/api/settings');
      fillSettingsForm();
    }
  });
});

document.getElementById('add-item').addEventListener('click', () => {
  addItem();
  refreshPreview();
});
document.getElementById('add-custom-field').addEventListener('click', () => {
  addCustomField();
  refreshPreview();
});
document.querySelector('.preview-tools').addEventListener('change', refreshPreview);
document.getElementById('sequence').addEventListener('input', refreshPreview);
document.getElementById('account-type').addEventListener('change', () => {
  if (document.getElementById('account-type').value === 'savings') {
    const gstin = document.getElementById('client-gstin');
    if (!gstin.value.trim()) gstin.value = 'NIL';
  }
  refreshPreview();
});
document.getElementById('invoice-form').addEventListener('input', () => {
  window.clearTimeout(window.__previewTimer);
  window.__previewTimer = setTimeout(refreshPreview, 250);
});
document.getElementById('client-select').addEventListener('change', (event) => {
  const client = clients.find((item) => item.id === event.target.value);
  applyClient(client);
  refreshPreview();
});
document.getElementById('load-sample').addEventListener('click', loadSample);

document.getElementById('invoice-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const invoice = await api('/api/invoices', { method: 'POST', body: formPayload() });
    toast(`Saved ${invoice.number}`);
    settings = await api('/api/settings');
    document.getElementById('sequence').value = settings.nextSequence;
    document.getElementById('s-next').value = settings.nextSequence;
    updateNumberFields();
    await loadInvoices();
  } catch (error) {
    toast(error.message);
  }
});

document.getElementById('download-pdf').addEventListener('click', async () => {
  try {
    await downloadCurrentPdf();
    toast('PDF downloaded');
  } catch (error) {
    toast(error.message, 6000);
  }
});

document.getElementById('download-word').addEventListener('click', async () => {
  try {
    const invoice = await api('/api/invoices/preview', { method: 'POST', body: formPayload() });
    downloadWord(invoice);
  } catch (error) {
    toast(error.message);
  }
});

document.getElementById('client-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = document.getElementById('client-id').value;
  const body = {
    contactName: document.getElementById('c-contact').value,
    companyName: document.getElementById('c-company').value,
    address: document.getElementById('c-address').value,
    email: document.getElementById('c-email').value,
    gstin: document.getElementById('c-gstin').value,
  };
  if (id) {
    await api(`/api/clients/${id}`, { method: 'PUT', body });
  } else {
    await api('/api/clients', { method: 'POST', body });
  }
  clients = await api('/api/clients');
  populateClients();
  document.getElementById('client-form').reset();
  document.getElementById('client-id').value = '';
  document.getElementById('client-form-title').textContent = 'Add client';
  toast('Client saved');
});

document.getElementById('reset-client').addEventListener('click', () => {
  document.getElementById('client-form').reset();
  document.getElementById('client-id').value = '';
  document.getElementById('client-form-title').textContent = 'Add client';
});

document.getElementById('client-list').addEventListener('click', async (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  if (editId) {
    const client = clients.find((item) => item.id === editId);
    document.getElementById('client-id').value = client.id;
    document.getElementById('c-contact').value = client.contactName;
    document.getElementById('c-company').value = client.companyName;
    document.getElementById('c-address').value = client.address;
    document.getElementById('c-email').value = client.email;
    document.getElementById('c-gstin').value = client.gstin;
    document.getElementById('client-form-title').textContent = 'Edit client';
  }
  if (deleteId) {
    await api(`/api/clients/${deleteId}`, { method: 'DELETE' });
    clients = await api('/api/clients');
    populateClients();
  }
});

document.getElementById('invoice-rows').addEventListener('click', async (event) => {
  const pdfId = event.target.dataset.pdf;
  const wordId = event.target.dataset.word;
  const id = event.target.dataset.reuse;
  if (pdfId) {
    try {
      await downloadSavedPdf(pdfId, event.target.dataset.name);
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  if (wordId) {
    try {
      const invoice = await api(`/api/invoices/${wordId}`);
      downloadWord(invoice);
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  if (!id) {
    return;
  }
  const invoice = await api(`/api/invoices/${id}`);
  document.getElementById('client-select').value = invoice.client.id || '';
  applyClient(invoice.client);
  document.getElementById('payment-kind').value = invoice.paymentKind;
  document.getElementById('account-type').value = invoice.accountType;
  document.getElementById('project-name').value = invoice.projectName;
  document.getElementById('duration').value = invoice.duration;
  document.getElementById('items').innerHTML = '';
  invoice.lineItems.forEach((item) => addItem(item));
  document.getElementById('custom-fields').innerHTML = '';
  (invoice.customFields || []).forEach((field) => addCustomField(field));
  applyLayout(invoice.layout);
  showView('create');
  refreshPreview();
});

document.getElementById('settings-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  settings = await api('/api/settings', {
    method: 'PUT',
    body: {
      invoicePrefix: document.getElementById('s-prefix').value,
      nextSequence: Number(document.getElementById('s-next').value),
      sequencePadding: Number(document.getElementById('s-pad').value),
      company: {
        name: document.getElementById('s-name').value,
        gstin: document.getElementById('s-gstin').value,
        address: document.getElementById('s-address').value,
        phone: document.getElementById('s-phone').value,
        email: document.getElementById('s-email').value,
      },
      signatory: {
        name: document.getElementById('s-sign-name').value,
        designation: document.getElementById('s-sign-role').value,
      },
      banks: {
        current: readBank('current'),
        savings: readBank('savings'),
      },
      terms: document
        .getElementById('s-terms')
        .value.split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    },
  });
  document.getElementById('sequence').value = settings.nextSequence;
  updateNumberFields();
  toast('Settings saved');
});

async function init() {
  if (window.STANDALONE) {
    const download = document.querySelector('.download-app');
    if (download) {
      download.textContent = 'Offline file';
      download.removeAttribute('href');
    }
  }
  settings = await api('/api/settings');
  clients = await api('/api/clients');
  fillSettingsForm();
  populateClients();
  document.getElementById('invoice-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('sequence').value = settings.nextSequence;
  addItem();
  updateNumberFields();
  updateBankSummary();
  if (clients[0]) {
    document.getElementById('client-select').value = clients[0].id;
    applyClient(clients[0]);
  }
  refreshPreview();
}

init();
