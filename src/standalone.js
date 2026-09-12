import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultClients, defaultSettings } from './defaults.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function dataUri(relativePath, mime) {
  const bytes = readFileSync(path.join(root, relativePath));
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

function offlineFetchScript(seed, assets) {
  return `window.STANDALONE = true;
window.__ASSETS = ${JSON.stringify(assets)};
window.__SEED = ${JSON.stringify(seed)};
(function () {
  const nativeFetch = window.fetch.bind(window);
  const KEY = 'introis-invoice-store-v1';

  function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }
  function computeTotals(lineItems) {
    const items = (lineItems || []).map(function (item) {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return Object.assign({}, item, {
        quantity: quantity,
        unitPrice: roundMoney(unitPrice),
        lineTotal: roundMoney(quantity * unitPrice),
      });
    });
    const subtotal = roundMoney(items.reduce(function (sum, item) { return sum + item.lineTotal; }, 0));
    const sgst = roundMoney(subtotal * 0.09);
    const cgst = roundMoney(subtotal * 0.09);
    return { items: items, subtotal: subtotal, sgst: sgst, cgst: cgst, total: roundMoney(subtotal + sgst + cgst), sgstRate: 9, cgstRate: 9 };
  }
  function formatInvoiceNumber(prefix, sequence, padding) {
    const numeric = Number(sequence) || 0;
    const width = Math.max(padding || 3, String(numeric).length);
    return prefix + String(numeric).padStart(width, '0');
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (error) {}
    const data = { settings: clone(window.__SEED.settings), clients: clone(window.__SEED.clients), invoices: [] };
    save(data);
    return data;
  }
  function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }
  function json(data, status) {
    status = status || 200;
    return new Response(status === 204 ? null : JSON.stringify(data), {
      status: status,
      headers: { 'content-type': 'application/json' },
    });
  }
  function buildInvoice(store, payload) {
    var settings = store.settings;
    var accountType = String(payload.accountType || 'current').toLowerCase();
    var totals = computeTotals(payload.lineItems || []);
    var sequence = Number(payload.sequence != null ? payload.sequence : settings.nextSequence);
    return {
      id: payload.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      prefix: settings.invoicePrefix,
      sequence: sequence,
      sequencePadding: settings.sequencePadding,
      number: formatInvoiceNumber(settings.invoicePrefix, sequence, settings.sequencePadding),
      invoiceDate: payload.invoiceDate || new Date().toISOString().slice(0, 10),
      paymentKind: payload.paymentKind || 'CASH / CREDIT',
      projectName: String(payload.projectName || '').trim(),
      duration: String(payload.duration || '').trim(),
      accountType: accountType,
      bank: Object.assign({}, settings.banks[accountType]),
      company: Object.assign({}, settings.company),
      signatory: Object.assign({}, settings.signatory),
      terms: (settings.terms || []).slice(),
      client: payload.client,
      lineItems: totals.items,
      subtotal: totals.subtotal,
      sgst: totals.sgst,
      cgst: totals.cgst,
      total: totals.total,
      sgstRate: totals.sgstRate,
      cgstRate: totals.cgstRate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  window.fetch = async function (url, options) {
    options = options || {};
    var path = String(url);
    try { path = new URL(path, location.href).pathname; } catch (error) {}
    var method = (options.method || 'GET').toUpperCase();
    var body = options.body ? JSON.parse(options.body) : {};
    if (path.indexOf('/api/') !== 0 && path !== '/health') {
      return nativeFetch(url, options);
    }
    var store = load();
    if (path === '/health') return json({ status: 'ok', service: 'invoice-generator' });
    if (path === '/api/settings' && method === 'GET') return json(store.settings);
    if (path === '/api/settings' && method === 'PUT') {
      store.settings = Object.assign({}, store.settings, body, {
        company: Object.assign({}, store.settings.company, body.company || {}),
        signatory: Object.assign({}, store.settings.signatory, body.signatory || {}),
        banks: {
          current: Object.assign({}, store.settings.banks.current, (body.banks && body.banks.current) || {}),
          savings: Object.assign({}, store.settings.banks.savings, (body.banks && body.banks.savings) || {}),
        },
        terms: body.terms || store.settings.terms,
      });
      if (body.nextSequence != null) store.settings.nextSequence = Number(body.nextSequence);
      if (body.sequencePadding != null) store.settings.sequencePadding = Number(body.sequencePadding);
      save(store);
      return json(store.settings);
    }
    if (path === '/api/clients' && method === 'GET') return json(store.clients);
    if (path === '/api/clients' && method === 'POST') {
      var client = {
        id: 'client-' + Date.now(),
        contactName: String(body.contactName || '').trim(),
        companyName: String(body.companyName || '').trim(),
        address: String(body.address || '').trim(),
        email: String(body.email || '').trim(),
        gstin: String(body.gstin || '').trim(),
      };
      if (!client.contactName || !client.companyName) return json({ error: 'contactName and companyName are required' }, 400);
      store.clients.push(client);
      save(store);
      return json(client, 201);
    }
    var clientMatch = path.match(/^\\/api\\/clients\\/([^/]+)$/);
    if (clientMatch && method === 'PUT') {
      var idx = store.clients.findIndex(function (item) { return item.id === clientMatch[1]; });
      if (idx === -1) return json({ error: 'client not found' }, 404);
      store.clients[idx] = Object.assign({}, store.clients[idx], body, { id: clientMatch[1] });
      save(store);
      return json(store.clients[idx]);
    }
    if (clientMatch && method === 'DELETE') {
      store.clients = store.clients.filter(function (item) { return item.id !== clientMatch[1]; });
      save(store);
      return json(null, 204);
    }
    if (path === '/api/invoices' && method === 'GET') {
      return json(store.invoices.slice().sort(function (a, b) { return b.sequence - a.sequence; }));
    }
    if (path === '/api/invoices' && method === 'POST') {
      if (!body.client || !body.client.contactName || !body.client.companyName) return json({ error: 'client contact name is required' }, 400);
      if (!body.lineItems || !body.lineItems.length) return json({ error: 'at least one line item is required' }, 400);
      var invoice = buildInvoice(store, body);
      store.invoices.push(invoice);
      if (invoice.sequence >= store.settings.nextSequence) store.settings.nextSequence = invoice.sequence + 1;
      save(store);
      return json(invoice, 201);
    }
    if (path === '/api/invoices/preview' && method === 'POST') {
      return json(buildInvoice(store, body));
    }
    var invoiceMatch = path.match(/^\\/api\\/invoices\\/([^/]+)(?:\\/pdf)?$/);
    if (invoiceMatch && method === 'GET') {
      var found = store.invoices.find(function (item) { return item.id === invoiceMatch[1]; });
      if (!found) return json({ error: 'invoice not found' }, 404);
      if (path.indexOf('/pdf') !== -1) {
        return new Response(JSON.stringify({ print: true, invoice: found }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return json(found);
    }
    if (path === '/api/invoices/preview.pdf' && method === 'POST') {
      return new Response(JSON.stringify({ print: true, invoice: buildInvoice(store, body) }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return json({ error: 'not found' }, 404);
  };
})();`;
}

export function buildStandaloneHtml() {
  const styles = readFileSync(path.join(root, 'public/styles.css'), 'utf8');
  const appJs = readFileSync(path.join(root, 'public/app.js'), 'utf8');
  let html = readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const assets = {
    logo: dataUri('public/assets/logo.png', 'image/png'),
    signature: dataUri('public/assets/signature.png', 'image/png'),
  };
  const seed = { settings: defaultSettings, clients: defaultClients };

  html = html.replace('<link rel="stylesheet" href="styles.css">', `<style>${styles}</style>`);
  html = html.replace('src="assets/logo.png"', `src="${assets.logo}"`);
  html = html.replace(
    '<a class="download-app" href="/download">Download app</a>',
    '<span class="download-app" title="You are using the downloaded app">Offline file</span>',
  );
  const safeApp = appJs.replace(/<\/script/gi, '<\\/script');
  const shim = offlineFetchScript(seed, assets).replace(/<\/script/gi, '<\\/script');
  html = html.replace(
    '<script type="module" src="app.js"></script>',
    `<script>${shim}</script>\n<script>${safeApp}</script>`,
  );
  return html;
}
