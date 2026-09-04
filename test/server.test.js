import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';

const PORT = 3456;

async function waitForHealth(url, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Server did not become healthy at ${url}`);
}

test('release create and copy flow', async () => {
  const server = spawn('node', ['src/server.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe',
  });

  try {
    await waitForHealth(`http://127.0.0.1:${PORT}/health`);

    const createResponse = await fetch(`http://127.0.0.1:${PORT}/releases`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'v1.0.0', body: 'Initial release notes' }),
    });

    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.equal(created.title, 'v1.0.0');

    const copyResponse = await fetch(`http://127.0.0.1:${PORT}/releases/${created.id}/copy`, {
      method: 'POST',
    });

    assert.equal(copyResponse.status, 201);
    const copied = await copyResponse.json();
    assert.equal(copied.title, 'v1.0.0 (copy)');
    assert.equal(copied.copiedFrom, created.id);
    assert.equal(copied.body, created.body);

    const mapResponse = await fetch(`http://127.0.0.1:${PORT}/release-change-state-map`);
    assert.equal(mapResponse.status, 200);
    const map = await mapResponse.json();
    assert.equal(map.authorizeAndApproval.releaseWhenPending, 'awaiting_approval');
    assert.equal(map.map.scheduled, 'scheduled');

    const resolveResponse = await fetch(`http://127.0.0.1:${PORT}/release-change-state-map/resolve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        changeState: 'Authorize',
        changeApproval: 'requested',
        currentReleaseState: 'draft',
      }),
    });
    assert.equal(resolveResponse.status, 200);
    const resolved = await resolveResponse.json();
    assert.equal(resolved.releaseState, 'awaiting_approval');
    assert.equal(resolved.changed, true);

    const backResponse = await fetch(`http://127.0.0.1:${PORT}/release-change-state-map/resolve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        changeState: 'Assess',
        changeApproval: 'not requested',
        currentReleaseState: 'awaiting_approval',
      }),
    });
    const movedBack = await backResponse.json();
    assert.equal(movedBack.releaseState, 'draft');
    assert.equal(movedBack.changed, true);
  } finally {
    server.kill();
    await once(server, 'exit');
  }
});
