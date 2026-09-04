import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMapper, loadStateMap } from '../src/releaseChangeStateMap.js';

const mapper = createMapper();

test('format lists the mapping and the cases it covers', () => {
  const map = loadStateMap();
  assert.equal(map.map.new, 'draft');
  assert.equal(map.authorizeAndApproval.releaseWhenPending, 'awaiting_approval');
  assert.ok(map.testCases.length >= 10);
});

test('New → Draft', () => {
  assert.equal(mapper.mapChangeToRelease({ changeState: 'New' }).releaseState, 'draft');
  assert.equal(mapper.mapChangeToRelease({ changeState: '-5' }).releaseState, 'draft');
});

test('Assess → Draft', () => {
  assert.equal(mapper.mapChangeToRelease({ changeState: 'Assess' }).releaseState, 'draft');
  assert.equal(mapper.mapChangeToRelease({ changeState: '-4' }).releaseState, 'draft');
});

test('Authorize with pending approval → Awaiting Approval', () => {
  const pending = [
    { changeState: 'Authorize', changeApproval: 'requested' },
    { changeState: '-3', changeApproval: 'not requested' },
    { changeState: 'authorization', changeApproval: 'rejected' },
    { changeState: 'Authorize' },
  ];

  for (const row of pending) {
    const result = mapper.mapChangeToRelease(row);
    assert.equal(result.releaseState, 'awaiting_approval', JSON.stringify(row));
    assert.equal(result.releaseStateLabel, 'Awaiting Approval');
  }
});

test('Approval state while still waiting → Awaiting Approval', () => {
  const result = mapper.mapChangeToRelease({
    changeState: 'Approval',
    changeApproval: 'requested',
  });
  assert.equal(result.releaseState, 'awaiting_approval');
});

test('Authorize after the Change is approved → Approved', () => {
  const result = mapper.mapChangeToRelease({
    changeState: 'Authorize',
    changeApproval: 'approved',
  });
  assert.equal(result.releaseState, 'approved');
});

test('Approval state after the Change is approved → Approved', () => {
  const result = mapper.mapChangeToRelease({
    changeState: 'Approval',
    changeApproval: 'approved',
  });
  assert.equal(result.releaseState, 'approved');
});

test('Scheduled / Implement / Review / Closed / Canceled', () => {
  const rows = [
    ['Scheduled', 'scheduled'],
    ['-2', 'scheduled'],
    ['Implement', 'implementation'],
    ['Review', 'review'],
    ['Closed', 'closed'],
    ['Canceled', 'cancelled'],
    ['cancelled', 'cancelled'],
  ];

  for (const [changeState, releaseState] of rows) {
    const result = mapper.mapChangeToRelease({ changeState, changeApproval: 'approved' });
    assert.equal(result.releaseState, releaseState, changeState);
  }
});

test('forward path through Change states moves the Release with it', () => {
  const steps = [
    { changeState: 'New', changeApproval: 'not requested', expect: 'draft' },
    { changeState: 'Assess', changeApproval: 'not requested', expect: 'draft' },
    { changeState: 'Authorize', changeApproval: 'requested', expect: 'awaiting_approval' },
    { changeState: 'Authorize', changeApproval: 'approved', expect: 'approved' },
    { changeState: 'Scheduled', changeApproval: 'approved', expect: 'scheduled' },
    { changeState: 'Implement', changeApproval: 'approved', expect: 'implementation' },
    { changeState: 'Review', changeApproval: 'approved', expect: 'review' },
    { changeState: 'Closed', changeApproval: 'approved', expect: 'closed' },
  ];

  let release = null;
  for (const step of steps) {
    const result = mapper.nextReleaseState(step, release);
    assert.equal(result.releaseState, step.expect, JSON.stringify(step));
    release = result.releaseStateValue;
  }
});

test('Change moving backwards moves the Release backwards', () => {
  let release = 'scheduled';

  let result = mapper.nextReleaseState(
    { changeState: 'Authorize', changeApproval: 'requested' },
    release,
  );
  assert.equal(result.releaseState, 'awaiting_approval');
  assert.equal(result.changed, true);
  release = result.releaseStateValue;

  result = mapper.nextReleaseState(
    { changeState: 'Assess', changeApproval: 'not requested' },
    release,
  );
  assert.equal(result.releaseState, 'draft');
  assert.equal(result.changed, true);
});

test('Canceled from mid-flow sets Release to Cancelled', () => {
  const result = mapper.nextReleaseState(
    { changeState: 'Canceled', changeApproval: 'cancelled' },
    'implementation',
  );
  assert.equal(result.releaseState, 'cancelled');
  assert.equal(result.changed, true);
});

test('unknown Change state leaves the Release alone', () => {
  const result = mapper.nextReleaseState(
    { changeState: 'On Hold', changeApproval: 'requested' },
    'scheduled',
  );
  assert.equal(result.matched, false);
  assert.equal(result.changed, false);
  assert.equal(result.previousReleaseState, 'scheduled');
});

test('no write when the Release is already on the mapped state', () => {
  const result = mapper.nextReleaseState(
    { changeState: 'Authorize', changeApproval: 'requested' },
    'awaiting_approval',
  );
  assert.equal(result.matched, true);
  assert.equal(result.changed, false);
});
