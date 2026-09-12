import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';

const PORT = 3456;

async function waitForHealth(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Server did not become healthy at ${url}`);
}

test('health and lab page are served', { timeout: 30000 }, async () => {
  const server = spawn('node', ['src/server.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe',
  });

  try {
    await waitForHealth(`http://127.0.0.1:${PORT}/health`);
    const health = await fetch(`http://127.0.0.1:${PORT}/health`);
    const body = await health.json();
    assert.equal(body.service, 'servicenow-itsm-lab');

    const page = await fetch(`http://127.0.0.1:${PORT}/`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /ITSM Script Lab/);
    assert.match(html, /Download HTML file/);

    const standalone = await fetch(`http://127.0.0.1:${PORT}/servicenow-itsm-lab.html`);
    assert.equal(standalone.status, 200);
    const lab = await standalone.text();
    assert.match(lab, /Copy solution into editor/);
    assert.match(lab, /data-mode="theory"/);

    const grader = await fetch(`http://127.0.0.1:${PORT}/lib/grader.js`);
    assert.equal(grader.status, 200);
  } finally {
    server.kill();
    await once(server, 'exit');
  }
});
