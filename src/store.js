import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defaultClients, defaultSettings } from './defaults.js';

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createStore(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });

  let data = {
    settings: clone(defaultSettings),
    clients: clone(defaultClients),
    invoices: [],
  };

  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    data = {
      settings: { ...clone(defaultSettings), ...(parsed.settings ?? {}) },
      clients: Array.isArray(parsed.clients) ? parsed.clients : clone(defaultClients),
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
    };
    data.settings.company = { ...defaultSettings.company, ...(data.settings.company ?? {}) };
    data.settings.signatory = { ...defaultSettings.signatory, ...(data.settings.signatory ?? {}) };
    data.settings.banks = {
      current: { ...defaultSettings.banks.current, ...(data.settings.banks?.current ?? {}) },
      savings: { ...defaultSettings.banks.savings, ...(data.settings.banks?.savings ?? {}) },
    };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    persist();
  }

  function persist() {
    const tmp = `${filePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(data, null, 2));
    renameSync(tmp, filePath);
  }

  return {
    getSettings() {
      return clone(data.settings);
    },
    updateSettings(patch) {
      data.settings = {
        ...data.settings,
        ...patch,
        company: { ...data.settings.company, ...(patch.company ?? {}) },
        signatory: { ...data.settings.signatory, ...(patch.signatory ?? {}) },
        banks: {
          current: { ...data.settings.banks.current, ...(patch.banks?.current ?? {}) },
          savings: { ...data.settings.banks.savings, ...(patch.banks?.savings ?? {}) },
        },
        terms: patch.terms ?? data.settings.terms,
      };
      if (patch.nextSequence !== undefined) {
        data.settings.nextSequence = Number(patch.nextSequence);
      }
      if (patch.sequencePadding !== undefined) {
        data.settings.sequencePadding = Number(patch.sequencePadding);
      }
      persist();
      return clone(data.settings);
    },
    listClients() {
      return clone(data.clients);
    },
    getClient(id) {
      return clone(data.clients.find((client) => client.id === id) ?? null);
    },
    createClient(fields) {
      const client = {
        id: `client-${Date.now()}`,
        contactName: String(fields.contactName ?? '').trim(),
        companyName: String(fields.companyName ?? '').trim(),
        address: String(fields.address ?? '').trim(),
        email: String(fields.email ?? '').trim(),
        gstin: String(fields.gstin ?? '').trim(),
        createdAt: nowIso(),
      };
      data.clients.push(client);
      persist();
      return clone(client);
    },
    updateClient(id, fields) {
      const index = data.clients.findIndex((client) => client.id === id);
      if (index === -1) {
        return null;
      }
      data.clients[index] = {
        ...data.clients[index],
        ...fields,
        id,
        updatedAt: nowIso(),
      };
      persist();
      return clone(data.clients[index]);
    },
    deleteClient(id) {
      const before = data.clients.length;
      data.clients = data.clients.filter((client) => client.id !== id);
      if (data.clients.length === before) {
        return false;
      }
      persist();
      return true;
    },
    listInvoices() {
      return clone(data.invoices).sort((a, b) => b.sequence - a.sequence);
    },
    getInvoice(id) {
      return clone(data.invoices.find((invoice) => invoice.id === id) ?? null);
    },
    createInvoice(invoice) {
      data.invoices.push(invoice);
      persist();
      return clone(invoice);
    },
    setNextSequence(value) {
      data.settings.nextSequence = Number(value);
      persist();
    },
  };
}
