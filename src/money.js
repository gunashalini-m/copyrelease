export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function computeTotals(lineItems, cgstRate = 9, sgstRate = 9) {
  const items = (lineItems ?? []).map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const lineTotal = roundMoney(quantity * unitPrice);
    return {
      ...item,
      quantity,
      unitPrice: roundMoney(unitPrice),
      lineTotal,
    };
  });

  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const sgst = roundMoney(subtotal * (sgstRate / 100));
  const cgst = roundMoney(subtotal * (cgstRate / 100));
  const total = roundMoney(subtotal + sgst + cgst);

  return { items, subtotal, sgst, cgst, total, sgstRate, cgstRate };
}

export function formatInr(value) {
  const amount = roundMoney(value);
  const negative = amount < 0;
  const [whole, fraction] = Math.abs(amount).toFixed(2).split('.');
  const lastThree = whole.slice(-3);
  const other = whole.slice(0, -3);
  const grouped = other ? `${other.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}` : lastThree;
  return `${negative ? '-' : ''}₹${grouped}.${fraction}`;
}

export function formatInvoiceNumber(prefix, sequence, padding = 3) {
  const numeric = Number(sequence) || 0;
  const width = Math.max(padding, String(numeric).length);
  return `${prefix}${String(numeric).padStart(width, '0')}`;
}

export function formatDateDisplay(isoDate) {
  if (!isoDate) {
    return '';
  }
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
