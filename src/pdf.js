import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { renderInvoiceHtml } from './invoice-html.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const chromePath = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';

function dataUri(filePath, mime) {
  const bytes = readFileSync(filePath);
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

export async function renderInvoicePdf(invoice) {
  const html = renderInvoiceHtml(invoice, {
    logoDataUri: dataUri(path.join(root, 'public/assets/logo.png'), 'image/png'),
    signatureDataUri: dataUri(path.join(root, 'public/assets/signature.png'), 'image/png'),
  });

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '14mm', bottom: '12mm', left: '14mm' },
    });
  } finally {
    await browser.close();
  }
}
