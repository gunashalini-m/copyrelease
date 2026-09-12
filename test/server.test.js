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
      sequence: 200,
      projectName: 'Ads',
      duration: 'June 2026',
      client: createdClient,
      lineItems: [{ description: 'Ads', quantity: 2, unitPrice: 500 }],
    }),
  }).then((res) => res.json());
  assert.equal(second.number, 'INTSINV200');
  assert.equal(second.bank.accountType, 'Savings');
  assert.equal(second.lineItems[0].lineTotal, 1000);

  const jumped = await fetch(`${url}/api/settings`).then((res) => res.json());
  assert.equal(jumped.nextSequence, 201);

  const pdfRes = await fetch(`${url}/api/invoices/${invoice.id}/pdf`);
  assert.equal(pdfRes.status, 200);
  assert.ok(pdfRes.headers.get('content-type')?.startsWith('application/pdf'));
  const pdf = Buffer.from(await pdfRes.arrayBuffer());
  assert.ok(pdf.subarray(0, 4).toString() === '%PDF');
  assert.ok(pdf.length > 1000);

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
  assert.ok(page.includes('accept-field'));
  assert.ok(page.includes('STANDALONE'));
});
