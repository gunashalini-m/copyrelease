const views = {
  create: document.getElementById('view-create'),
  history: document.getElementById('view-history'),
  clients: document.getElementById('view-clients'),
  settings: document.getElementById('view-settings'),
};

let settings = null;
let clients = [];

function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.hidden = false;
  setTimeout(() => {
    el.hidden = true;
  }, 2400);
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
    <label>Description <input class="desc" value="${item.description ?? ''}"></label>
    <label>Qty <input class="qty" type="number" min="0" step="1" value="${item.quantity ?? 1}"></label>
    <label>Unit price <input class="price" type="number" min="0" step="0.01" value="${item.unitPrice ?? 0}"></label>
    <button type="button" class="ghost remove" aria-label="Remove item">×</button>
  `;
  row.querySelector('.remove').addEventListener('click', () => {
    row.remove();
    refreshPreview();
  });
  row.querySelectorAll('input').forEach((input) => input.addEventListener('input', refreshPreview));
  document.getElementById('items').append(row);
}

function lineItems() {
  return [...document.querySelectorAll('#items .item-row')].map((row) => ({
    description: row.querySelector('.desc').value,
    quantity: Number(row.querySelector('.qty').value || 0),
    unitPrice: Number(row.querySelector('.price').value || 0),
  }));
}

function formPayload() {
  return {
    sequence: Number(document.getElementById('sequence').value),
    invoiceDate: document.getElementById('invoice-date').value,
    paymentKind: document.getElementById('payment-kind').value,
    accountType: document.getElementById('account-type').value,
    projectName: document.getElementById('project-name').value,
    duration: document.getElementById('duration').value,
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
  document.getElementById('bank-summary').textContent = bank
    ? `${bank.accountType} · ${bank.bankName}\n${bank.holderName} · ${bank.accountNumber || '(add account number in Settings)'}\nIFSC ${bank.ifsc} · ${bank.branch}`
    : '';
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
  const sgst = Math.round(subtotal * 0.09 * 100) / 100;
  const cgst = Math.round(subtotal * 0.09 * 100) / 100;
  document.getElementById('totals').innerHTML = `
    Total without taxes ${formatInr(subtotal)}<br>
    SGST @9% ${formatInr(sgst)} · CGST @9% ${formatInr(cgst)}<br>
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

function previewSrcDoc(invoice) {
  const rows = invoice.lineItems
    .map(
      (item, index) =>
        `<tr><td>${index + 1}</td><td>${escapeHtml(item.description).replaceAll('\n', '<br>')}</td><td style="text-align:right">${formatInr(item.unitPrice)}</td><td style="text-align:right">${formatInr(item.lineTotal)}</td></tr>`,
    )
    .join('');
  const address = (value) => escapeHtml(value).replaceAll('\n', '<br>');
  return `<!DOCTYPE html><html><head><style>
    body{font-family:Calibri,Segoe UI,Arial,sans-serif;color:#1c1c1c;padding:18px;font-size:13px}
    .head{display:flex;justify-content:space-between;align-items:flex-start}
    img.logo{height:52px} h1{color:#1b2c6b;margin:0}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}
    table{width:100%;border-collapse:collapse} th{background:#cfe6f7;text-align:left}
    th,td{border:1px solid #d5dbe3;padding:8px}
    .blue{color:#1d5fa8;font-weight:700}
    .tot{width:280px;margin-left:auto}
    .tot div{display:flex;justify-content:space-between}
  </style></head><body>
    <div class="head"><img class="logo" src="${window.__ASSETS?.logo || 'assets/logo.png'}"><div style="text-align:right"><h1>INVOICE</h1><div>${escapeHtml(invoice.paymentKind)}</div></div></div>
    <div class="grid">
      <div><strong>From</strong><br>${escapeHtml(invoice.company.name)}<br>${address(invoice.company.address)}<br>GSTIN: ${escapeHtml(invoice.company.gstin)}</div>
      <div><strong>Bill To</strong><br>${escapeHtml(invoice.client.contactName)}<br>${escapeHtml(invoice.client.companyName)}<br>${address(invoice.client.address)}<br>GSTIN: ${escapeHtml(invoice.client.gstin)}</div>
    </div>
    <div class="grid">
      <div><strong>Invoice Number:</strong> ${escapeHtml(invoice.number)}<br><strong>Invoice Date:</strong> ${escapeHtml(formatDateDisplay(invoice.invoiceDate))}</div>
      <div class="blue">BANK DETAILS</div>
      <div></div>
      <div>Bank Name: ${escapeHtml(invoice.bank.bankName)}<br>A/C Holder Name: ${escapeHtml(invoice.bank.holderName)}<br>Account number: ${escapeHtml(invoice.bank.accountNumber)}<br>IFSC: ${escapeHtml(invoice.bank.ifsc)}<br>Account Type: ${escapeHtml(invoice.bank.accountType)}<br>Branch: ${escapeHtml(invoice.bank.branch)}</div>
    </div>
    <p class="blue">PROJECT OVERVIEW</p>
    <p><strong>Project Name:</strong> ${escapeHtml(invoice.projectName)}<br><strong>Duration:</strong> ${escapeHtml(invoice.duration)}</p>
    <table><thead><tr><th>S.No</th><th>Description</th><th>Unit Price</th><th>Line Total</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tot blue">
      <div><span>Total Without Taxes</span><span>${formatInr(invoice.subtotal)}</span></div>
      <div><span>SGST @9%</span><span>${formatInr(invoice.sgst)}</span></div>
      <div><span>CGST @9%</span><span>${formatInr(invoice.cgst)}</span></div>
      <div><span>Total Invoice Value</span><span>${formatInr(invoice.total)}</span></div>
    </div>
  </body></html>`;
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

function openPrintableInvoice(invoice) {
  const logo = window.__ASSETS?.logo || 'assets/logo.png';
  const signature = window.__ASSETS?.signature || 'assets/signature.png';
  const rows = invoice.lineItems
    .map(
      (item, index) =>
        `<tr><td style="text-align:center">${index + 1}</td><td>${escapeHtml(item.description).replaceAll('\n', '<br>')}</td><td style="text-align:right">${formatInr(item.unitPrice)}</td><td style="text-align:right">${formatInr(item.lineTotal)}</td></tr>`,
    )
    .join('');
  const address = (value) => escapeHtml(value).replaceAll('\n', '<br>');
  const html = `<!DOCTYPE html><html><head><title>${escapeHtml(invoice.number)}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:12px}
      .head{display:flex;justify-content:space-between;align-items:flex-start}
      img.logo{height:48px} h1{color:#1b2c6b;margin:0}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:12px 0}
      table{width:100%;border-collapse:collapse} th{background:#cfe6f7;text-align:left}
      th,td{border:1px solid #d5dbe3;padding:7px}
      .blue{color:#1d5fa8;font-weight:700}
      .tot{width:280px;margin-left:auto}
      .tot div{display:flex;justify-content:space-between}
      .sign{text-align:right} .sign img{height:34px}
      .page-break{page-break-before:always}
    </style></head><body>
    <div class="head"><img class="logo" src="${logo}"><div style="text-align:right"><h1>INVOICE</h1><div>${escapeHtml(invoice.paymentKind)}</div></div></div>
    <div class="grid">
      <div><strong>From</strong><br>${escapeHtml(invoice.company.name)}<br>${address(invoice.company.address)}<br>Phone: ${escapeHtml(invoice.company.phone)}<br>Email: ${escapeHtml(invoice.company.email)}<br>GSTIN: ${escapeHtml(invoice.company.gstin)}</div>
      <div><strong>Bill To</strong><br>${escapeHtml(invoice.client.contactName)}<br>${escapeHtml(invoice.client.companyName)}<br>${address(invoice.client.address)}<br>Email: ${escapeHtml(invoice.client.email)}<br>GSTIN of Recipient: ${escapeHtml(invoice.client.gstin)}</div>
    </div>
    <div class="grid">
      <div><strong>Invoice Number:</strong> ${escapeHtml(invoice.number)}<br><strong>Invoice Date:</strong> ${escapeHtml(formatDateDisplay(invoice.invoiceDate))}</div>
      <div><strong class="blue">BANK DETAILS</strong><br>Bank Name: ${escapeHtml(invoice.bank.bankName)}<br>A/C Holder Name: ${escapeHtml(invoice.bank.holderName)}<br>Account number: ${escapeHtml(invoice.bank.accountNumber)}<br>IFSC: ${escapeHtml(invoice.bank.ifsc)}<br>Account Type: ${escapeHtml(invoice.bank.accountType)}<br>Branch: ${escapeHtml(invoice.bank.branch)}</div>
    </div>
    <p class="blue">PROJECT OVERVIEW</p>
    <p><strong>Project Name:</strong> ${escapeHtml(invoice.projectName)}<br><strong>Duration of Project Completion:</strong> ${escapeHtml(invoice.duration)}</p>
    <table><thead><tr><th>S.No</th><th>Description</th><th>Unit Price</th><th>Line Total</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tot blue">
      <div><span>Total Without Taxes</span><span>${formatInr(invoice.subtotal)}</span></div>
      <div><span>SGST @9%</span><span>${formatInr(invoice.sgst)}</span></div>
      <div><span>CGST @9%</span><span>${formatInr(invoice.cgst)}</span></div>
      <div><span>Total Invoice Value</span><span>${formatInr(invoice.total)}</span></div>
    </div>
    <div class="grid" style="margin-top:28px">
      <div><p class="blue">CLIENT ACCEPTANCE</p><p>Client Name:</p><p>Date:</p><p>Signature:</p></div>
      <div class="sign"><img src="${signature}" alt=""><div class="blue">AUTHORISED SIGNATURE</div><p>Name: ${escapeHtml(invoice.signatory.name)}<br>Designation: ${escapeHtml(invoice.signatory.designation)}<br>Date: ${escapeHtml(formatDateDisplay(invoice.invoiceDate))}</p></div>
    </div>
    <div class="page-break"><h2>Terms and Conditions</h2>${(invoice.terms || []).map((term) => `<p>${escapeHtml(term)}</p>`).join('')}</div>
  </body></html>`;
  const popup = window.open('', '_blank');
  if (!popup) {
    throw new Error('Allow pop-ups to print or save the invoice as a PDF');
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
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
      openPrintableInvoice(data.invoice);
      return;
    }
    throw new Error(data.error || 'Could not build PDF');
  }
  triggerDownload(await response.blob(), filename);
}

async function downloadCurrentPdf() {
  const preview = await api('/api/invoices/preview', { method: 'POST', body: formPayload() });
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
          <td>${invoice.bank.accountType}</td>
          <td>${formatInr(invoice.total)}</td>
          <td>
            <button type="button" class="ghost" data-pdf="${invoice.id}" data-name="${invoice.number}">Download PDF</button>
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
    description: 'Meta Advertisement Posting Charges\n(Facebook& Instagram Handles)',
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
document.getElementById('sequence').addEventListener('input', refreshPreview);
document.getElementById('account-type').addEventListener('change', refreshPreview);
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
  const id = event.target.dataset.reuse;
  if (pdfId) {
    try {
      await downloadSavedPdf(pdfId, event.target.dataset.name);
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
