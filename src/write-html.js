import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStandaloneHtml } from './standalone.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = buildStandaloneHtml();

for (const relative of [
  'index.html',
  'Introis-Invoice-Generator.html',
  'public/index.html',
]) {
  const filePath = path.join(root, relative);
  writeFileSync(filePath, html);
  console.log('wrote', relative, html.length, 'bytes');
}
