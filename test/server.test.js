import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createApp } from '../src/server.js';

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${port}`,
      });
    });
  });
}

test('health, numbering, clients, and invoice snapshots', async (t) => {
  const storePath = path.join(mkdtempSync(path.join(tmpdir(), 'inv-')), 'store.json');
  const { server, url } = await listen(createApp({ storePath }));
  t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));

  const health = await fetch(`${url}/health`).then((res) => res.json());
  assert.equal(health.service, 'invoice-generator');

  const settings = await fetch(`${url}/api/settings`).then((res) => res.json());
  assert.equal(settings.invoicePrefix, 'INTSINV');
  assert.equal(settings.nextSequence, 99);
  assert.equal(settings.nonGstInvoicePrefix, 'INTS-');
  assert.equal(settings.nextNonGstSequence, 1);

  await fetch(`${url}/api/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nextSequence: 105 }),
  });

  const clients = await fetch(`${url}/api/clients`).then((res) => res.json());
  assert.equal(clients[0].companyName, 'Kovai Heart Foundation (P) LTD');

  const createdClient = await fetch(`${url}/api/clients`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contactName: 'Test Buyer', companyName: 'Test Co' }),
  }).then(async (res) => {
    assert.equal(res.status, 201);
    return res.json();
  });

  const invoiceRes = await fetch(`${url}/api/invoices`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      accountType: 'current',
      projectName: 'Monthly retainer',
      duration: 'May 2026',
      client: createdClient,
      lineItems: [{ description: 'Service charges', quantity: 1, unitPrice: 1000 }],
    }),
  });
  assert.equal(invoiceRes.status, 201);
  const invoice = await invoiceRes.json();
  assert.equal(invoice.number, 'INTSINV105');
  assert.equal(invoice.bank.accountType, 'Current');
  assert.equal(invoice.bank.accountNumber, '50200076255606');
  assert.equal(invoice.sgst, 90);
  assert.equal(invoice.total, 1180);

  const after = await fetch(`${url}/api/settings`).then((res) => res.json());
  assert.equal(after.nextSequence, 106);

  const second = await fetch(`${url}/api/invoices`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      accountType: 'savings',
      projectName: 'Ads',
      duration: 'June 2026',
      client: createdClient,
      lineItems: [{ description: 'Ads', quantity: 2, unitPrice: 500 }],
    }),
  }).then((res) => res.json());
  assert.equal(second.number, 'INTS-001');
  assert.equal(second.prefix, 'INTS-');
  assert.equal(second.bank.accountType, 'Savings');
  assert.equal(second.lineItems[0].lineTotal, 1000);
  assert.equal(second.sgst, 0);
  assert.equal(second.cgst, 0);
  assert.equal(second.total, 1000);
  assert.equal(second.taxMode, 'non-gst');
  assert.equal(second.client.gstin, 'NIL');

  const afterSavings = await fetch(`${url}/api/settings`).then((res) => res.json());
  assert.equal(afterSavings.nextSequence, 106);
  assert.equal(afterSavings.nextNonGstSequence, 2);

  const jumped = await fetch(`${url}/api/invoices`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      accountType: 'savings',
      sequence: 200,
      projectName: 'Ads',
      duration: 'June 2026',
      client: createdClient,
      lineItems: [{ description: 'Ads', quantity: 1, unitPrice: 500 }],
    }),
  }).then((res) => res.json());
  assert.equal(jumped.number, 'INTS-200');
  const afterJump = await fetch(`${url}/api/settings`).then((res) => res.json());
  assert.equal(afterJump.nextSequence, 106);
  assert.equal(afterJump.nextNonGstSequence, 201);

  const pdfRes = await fetch(`${url}/api/invoices/${invoice.id}/pdf`);
  assert.equal(pdfRes.status, 200);
  assert.ok(pdfRes.headers.get('content-type')?.startsWith('application/pdf'));
  const pdf = Buffer.from(await pdfRes.arrayBuffer());
  assert.ok(pdf.subarray(0, 4).toString() === '%PDF');
  assert.ok(pdf.length > 1000);

  const printPdfRes = await fetch(`${url}/api/invoices/preview.pdf`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      accountType: 'savings',
      projectName: 'A KOLANDHA MUDALIAR SONS - Social Media Management',
      duration: 'May 2026 - Monthly Retainer',
      client: createdClient,
      lineItems: [
        {
          description: 'Social Media Management charges (from May 18th to May 31st 2026)',
          quantity: 1,
          unitPrice: 9333.33,
        },
      ],
    }),
  });
  assert.equal(printPdfRes.status, 200);
  const printPdf = Buffer.from(await printPdfRes.arrayBuffer());
  const pageCount = [...printPdf.toString('latin1').matchAll(/\/Type\s*\/Page(?![s\w])/g)].length;
  assert.equal(pageCount, 1);

  const fileRes = await fetch(`${url}/download`);
  assert.equal(fileRes.status, 200);
  assert.match(fileRes.headers.get('content-disposition') || '', /Introis-Invoice-Generator.html/);
  const html = await fileRes.text();
  assert.ok(html.includes('STANDALONE'));
  assert.ok(html.includes('data:image/png;base64'));
  const page = await fetch(`${url}/`).then((res) => res.text());
  assert.ok(page.includes('<style>'));
  assert.ok(page.includes('.sidebar'));
  assert.ok(page.includes('Aptos'));
  assert.ok(page.includes('#002060'));
  assert.ok(page.includes('<b>From</b>'));
  assert.ok(page.includes('<b>Bill To</b>'));
  assert.ok(page.includes('<b>Bank Details</b>'));
  assert.ok(page.includes('margin-top:15pt'));
  assert.ok(page.includes('row-gap:15pt'));
  assert.ok(page.includes('padding-bottom:15pt'));
  assert.ok(page.includes('margin-top:30pt'));
  assert.ok(html.includes('margin-top:30pt'));
  assert.ok(page.includes('.section.terms{margin-top:15pt}'));
  assert.ok(html.includes('.section.terms{margin-top:15pt}'));
  assert.ok(page.includes('.sign p{display:block;text-align:left'));
  assert.ok(page.includes('s-non-gst-prefix'));
  assert.ok(page.includes('INTS-'));
  assert.ok(page.includes('padding:8px 12px'));
  assert.ok(html.includes('padding:8px 12px'));
  assert.ok(page.includes('border-spacing:2px'));
  assert.ok(page.includes('col-desc'));
  assert.ok(page.includes('#eef7fc'));
  assert.ok(page.includes('print-color-adjust: exact'));
  assert.ok(page.includes('downloadInvoicePdf'));
  assert.ok(page.includes('html2canvas'));
  assert.ok(page.includes('srcdoc'));
  assert.ok(page.includes('STANDALONE'));
  assert.ok(page.includes('preview-scaler'));
  assert.ok(page.includes('fitLivePreview'));
  assert.ok(page.includes('table-scroll'));
  assert.ok(page.includes('@media (max-width: 699px)'));
  assert.ok(page.includes('@container (max-width: 420px)'));
  assert.ok(!page.includes('Custom fields'));
  assert.ok(!page.includes('page-break terms'));
});
