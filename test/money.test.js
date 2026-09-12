import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeTotals, formatInvoiceNumber, formatInr } from '../src/money.js';

test('indian rupee grouping and gst totals match the sample invoice', () => {
  const totals = computeTotals([
    { description: 'Service', quantity: 1, unitPrice: 9167 },
    { description: 'Design', quantity: 1, unitPrice: 2550 },
    { description: 'Ads', quantity: 1, unitPrice: 3000 },
  ]);

  assert.equal(totals.subtotal, 14717);
  assert.equal(totals.sgst, 1324.53);
  assert.equal(totals.cgst, 1324.53);
  assert.equal(totals.total, 17366.06);
  assert.equal(formatInr(totals.subtotal), '₹14,717.00');
  assert.equal(formatInr(9167), '₹9,167.00');
});

test('invoice numbers pad the sequence', () => {
  assert.equal(formatInvoiceNumber('INTSINV', 98, 3), 'INTSINV098');
  assert.equal(formatInvoiceNumber('INTSINV', 99, 3), 'INTSINV099');
  assert.equal(formatInvoiceNumber('INTSINV', 100, 3), 'INTSINV100');
});
