import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeTotals, formatInvoiceNumber, formatInr, numberingForAccount, taxRatesForAccount } from '../src/money.js';

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

test('savings / non-gst invoices keep sgst and cgst at zero', () => {
  const rates = taxRatesForAccount('savings');
  assert.equal(rates.taxMode, 'non-gst');
  assert.equal(rates.sgstRate, 0);
  assert.equal(rates.cgstRate, 0);
  const totals = computeTotals([{ description: 'SMM', quantity: 1, unitPrice: 9333.33 }], rates.cgstRate, rates.sgstRate);
  assert.equal(totals.subtotal, 9333.33);
  assert.equal(totals.sgst, 0);
  assert.equal(totals.cgst, 0);
  assert.equal(totals.total, 9333.33);
  assert.equal(taxRatesForAccount('current').taxMode, 'gst');
});

test('invoice numbers pad the sequence', () => {
  assert.equal(formatInvoiceNumber('INTSINV', 98, 3), 'INTSINV098');
  assert.equal(formatInvoiceNumber('INTSINV', 99, 3), 'INTSINV099');
  assert.equal(formatInvoiceNumber('INTSINV', 100, 3), 'INTSINV100');
  assert.equal(formatInvoiceNumber('INTS-', 1, 3), 'INTS-001');
});

test('savings invoices use the non-gst prefix and sequence', () => {
  const settings = {
    invoicePrefix: 'INTSINV',
    nextSequence: 105,
    nonGstInvoicePrefix: 'INTS-',
    nextNonGstSequence: 7,
    sequencePadding: 3,
  };
  const gst = numberingForAccount(settings, 'current');
  assert.equal(gst.prefix, 'INTSINV');
  assert.equal(gst.nextSequence, 105);
  const nonGst = numberingForAccount(settings, 'savings');
  assert.equal(nonGst.prefix, 'INTS-');
  assert.equal(nonGst.nextSequence, 7);
  assert.equal(formatInvoiceNumber(nonGst.prefix, nonGst.nextSequence, nonGst.sequencePadding), 'INTS-007');
});
