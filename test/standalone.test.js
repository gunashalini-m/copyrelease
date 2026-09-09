import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('standalone HTML file is downloadable and self-contained', () => {
  const file = path.join(root, 'servicenow-itsm-lab.html');
  assert.equal(fs.existsSync(file), true);
  const html = fs.readFileSync(file, 'utf8');
  assert.match(html, /data-mode="theory"/);
  assert.match(html, /Incident table/);
  assert.match(html, /Incident Management/);
  assert.match(html, /Integrations/);
  assert.match(html, /GlideRecord/);
  assert.match(html, /RESTMessageV2/);
  assert.doesNotMatch(html, /type="module"/);
  assert.ok(html.length > 50_000);
});
