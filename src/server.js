import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { computeTotals, formatInvoiceNumber } from './money.js';
import { renderInvoicePdf } from './pdf.js';
import { buildStandaloneHtml } from './standalone.js';
import { createStore } from './store.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    return `${field} is required`;
  }
  return null;
}

function buildInvoiceRecord(store, payload, { existing } = {}) {
  const settings = store.getSettings();
  const accountType = String(payload.accountType || 'current').toLowerCase();
  if (accountType !== 'current' && accountType !== 'savings') {
    throw Object.assign(new Error('accountType must be current or savings'), { status: 400 });
  }

  const clientError =
    requiredString(payload.client?.contactName, 'client contact name') ||
    requiredString(payload.client?.companyName, 'client company');
  if (clientError) {
    throw Object.assign(new Error(clientError), { status: 400 });
  }

  const lineItems = Array.isArray(payload.lineItems) ? payload.lineItems : [];
  if (lineItems.length === 0) {
    throw Object.assign(new Error('at least one line item is required'), { status: 400 });
  }

  const totals = computeTotals(lineItems);
  const sequence = existing
    ? existing.sequence
    : Number(payload.sequence ?? settings.nextSequence);
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw Object.assign(new Error('sequence must be a positive integer'), { status: 400 });
  }

  return {
    id: existing?.id ?? randomUUID(),
    prefix: settings.invoicePrefix,
    sequence,
    sequencePadding: settings.sequencePadding,
    number: formatInvoiceNumber(settings.invoicePrefix, sequence, settings.sequencePadding),
    invoiceDate: payload.invoiceDate || new Date().toISOString().slice(0, 10),
    paymentKind: payload.paymentKind || 'CASH / CREDIT',
    projectName: String(payload.projectName ?? '').trim(),
    duration: String(payload.duration ?? '').trim(),
    accountType,
    bank: { ...settings.banks[accountType] },
    company: { ...settings.company },
    signatory: { ...settings.signatory },
    terms: [...settings.terms],
    client: {
      id: payload.client?.id || null,
      contactName: String(payload.client.contactName).trim(),
      companyName: String(payload.client.companyName).trim(),
      address: String(payload.client.address ?? '').trim(),
      email: String(payload.client.email ?? '').trim(),
      gstin: String(payload.client.gstin ?? '').trim(),
    },
    lineItems: totals.items.map((item) => ({
      description: String(item.description ?? '').trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    subtotal: totals.subtotal,
    sgst: totals.sgst,
    cgst: totals.cgst,
    total: totals.total,
    sgstRate: totals.sgstRate,
    cgstRate: totals.cgstRate,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createApp({ storePath } = {}) {
  const store = createStore(
    storePath || path.join(root, 'data', 'store.json'),
  );
  const app = express();

  app.use(express.json({ limit: '2mb' }));
  app.use(express.static(path.join(root, 'public')));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'invoice-generator' });
  });

  app.get('/download', (_req, res) => {
    const html = buildStandaloneHtml();
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader(
      'content-disposition',
      'attachment; filename="Introis-Invoice-Generator.html"',
    );
    res.send(html);
  });

  app.get('/api/settings', (_req, res) => {
    res.json(store.getSettings());
  });

  app.put('/api/settings', (req, res) => {
    res.json(store.updateSettings(req.body ?? {}));
  });

  app.get('/api/clients', (_req, res) => {
    res.json(store.listClients());
  });

  app.post('/api/clients', (req, res) => {
    const body = req.body ?? {};
    if (!String(body.contactName ?? '').trim() || !String(body.companyName ?? '').trim()) {
      return res.status(400).json({ error: 'contactName and companyName are required' });
    }
    res.status(201).json(store.createClient(body));
  });

  app.put('/api/clients/:id', (req, res) => {
    const updated = store.updateClient(req.params.id, req.body ?? {});
    if (!updated) {
      return res.status(404).json({ error: 'client not found' });
    }
    res.json(updated);
  });

  app.delete('/api/clients/:id', (req, res) => {
    if (!store.deleteClient(req.params.id)) {
      return res.status(404).json({ error: 'client not found' });
    }
    res.status(204).end();
  });

  app.get('/api/invoices', (_req, res) => {
    res.json(store.listInvoices());
  });

  app.get('/api/invoices/:id', (req, res) => {
    const invoice = store.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'invoice not found' });
    }
    res.json(invoice);
  });

  app.post('/api/invoices', (req, res) => {
    try {
      const invoice = buildInvoiceRecord(store, req.body ?? {});
      const settings = store.getSettings();
      store.createInvoice(invoice);
      if (invoice.sequence >= settings.nextSequence) {
        store.setNextSequence(invoice.sequence + 1);
      }
      res.status(201).json(invoice);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  app.post('/api/invoices/preview', (req, res) => {
    try {
      res.json(buildInvoiceRecord(store, req.body ?? {}));
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  app.get('/api/invoices/:id/pdf', async (req, res) => {
    const invoice = store.getInvoice(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'invoice not found' });
    }
    try {
      const pdf = Buffer.from(await renderInvoicePdf(invoice));
      res.setHeader('content-type', 'application/pdf');
      res.setHeader(
        'content-disposition',
        `attachment; filename="${invoice.number}.pdf"`,
      );
      res.end(pdf);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/invoices/preview.pdf', async (req, res) => {
    try {
      const invoice = buildInvoiceRecord(store, req.body ?? {});
      const pdf = Buffer.from(await renderInvoicePdf(invoice));
      res.setHeader('content-type', 'application/pdf');
      res.setHeader(
        'content-disposition',
        `attachment; filename="${invoice.number}.pdf"`,
      );
      res.end(pdf);
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  });

  return app;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT) || 3000;
  const app = createApp();
  app.listen(port, '0.0.0.0', () => {
    console.log(`invoice generator listening on http://0.0.0.0:${port}`);
  });
}
