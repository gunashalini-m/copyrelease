import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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

const packRoot = path.join(root, '.pack');
const packDir = path.join(packRoot, 'Introis Invoice Generator');
rmSync(packRoot, { recursive: true, force: true });
mkdirSync(packDir, { recursive: true });
copyFileSync(path.join(root, 'index.html'), path.join(packDir, 'index.html'));
copyFileSync(path.join(root, 'HOW-TO-RUN.txt'), path.join(packDir, 'HOW-TO-RUN.txt'));
const zipName = 'Introis Invoice Generator.zip';
const zipPath = path.join(root, zipName);
if (existsSync(zipPath)) rmSync(zipPath);
execFileSync('zip', ['-r', zipPath, 'Introis Invoice Generator'], { cwd: packRoot });
rmSync(packRoot, { recursive: true, force: true });
console.log('wrote', zipName);
