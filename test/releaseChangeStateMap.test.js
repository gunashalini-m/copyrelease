import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMapper, loadStateMap } from '../src/releaseChangeStateMap.js';

const mapper = createMapper();

test('mapping format loads with required sections', () => {
  const map = loadStateMap();
  assert.equal(map.version, 1);
  assert.ok(Array.isArray(map.rules) && map.rules.length > 0);
  assert.ok(map.change.states.authorize);
  assert.ok(map.release.states.awaiting_approval);
});

test('Authorize with pending approval maps Release to Awaiting Approval', () => {
  const pending = [
    { changeState: 'Authorize', changeApproval: 'requested' },
    { changeState: '-3', changeApproval: 'not requested' },
    { changeState: 'authorization', changeApproval: 'rejected' },
    { changeState: 'Approval', changeApproval: 'requested' },
    { changeState: 'Authorize' },
  ];

  for (const snapshot of pending) {
    const result = mapper.mapChangeToRelease(snapshot);
    assert.equal(result.matched, true, JSON.stringify(snapshot));
    assert.equal(result.releaseState, 'awaiting_approval');
    assert.equal(result.releaseStateLabel, 'Awaiting Approval');
  }
});

test('Authorize after approval maps Release to Approved', () => {
  const result = mapper.mapChangeToRelease({
    changeState: 'Authorize',
    changeApproval: 'approved',
  });
  assert.equal(result.releaseState, 'approved');
  assert.equal(result.ruleId, 'authorize-approved');
});

test('remaining Change states map to the matching Release states', () => {
  const cases = [
    ['New', 'draft'],
    ['-5', 'draft'],
    ['Assess', 'draft'],
    ['Scheduled', 'scheduled'],
    ['Implement', 'implementation'],
    ['Review', 'review'],
    ['Closed', 'closed'],
    ['Canceled', 'cancelled'],
    ['cancelled', 'cancelled'],
  ];

  for (const [changeState, releaseState] of cases) {
    const result = mapper.mapChangeToRelease({ changeState, changeApproval: 'approved' });
    assert.equal(result.releaseState, releaseState, changeState);
  }
});

test('Change moving back and forth moves Release with it', () => {
  const sequence = [
    { changeState: 'New', changeApproval: 'not requested', expect: 'draft' },
    { changeState: 'Assess', changeApproval: 'not requested', expect: 'draft' },
    { changeState: 'Authorize', changeApproval: 'requested', expect: 'awaiting_approval' },
    { changeState: 'Authorize', changeApproval: 'approved', expect: 'approved' },
    { changeState: 'Scheduled', changeApproval: 'approved', expect: 'scheduled' },
    { changeState: 'Authorize', changeApproval: 'requested', expect: 'awaiting_approval' },
    { changeState: 'Assess', changeApproval: 'not requested', expect: 'draft' },
    { changeState: 'Implement', changeApproval: 'approved', expect: 'implementation' },
    { changeState: 'Scheduled', changeApproval: 'approved', expect: 'scheduled' },
    { changeState: 'Review', changeApproval: 'approved', expect: 'review' },
    { changeState: 'Closed', changeApproval: 'approved', expect: 'closed' },
    { changeState: 'Canceled', changeApproval: 'cancelled', expect: 'cancelled' },
  ];

  let currentRelease = null;
  for (const step of sequence) {
    const result = mapper.nextReleaseState(step, currentRelease);
    assert.equal(result.matched, true, JSON.stringify(step));
    assert.equal(result.releaseState, step.expect, JSON.stringify(step));
    if (currentRelease !== result.releaseStateValue) {
      assert.equal(result.changed, true, JSON.stringify(step));
    }
    currentRelease = result.releaseStateValue;
  }
});

test('unknown Change state does not move the Release', () => {
  const result = mapper.nextReleaseState(
    { changeState: 'On Hold', changeApproval: 'requested' },
    'scheduled',
  );
  assert.equal(result.matched, false);
  assert.equal(result.changed, false);
  assert.equal(result.previousReleaseState, 'scheduled');
  assert.equal(result.releaseState, null);
});

test('no-op when Release is already on the mapped state', () => {
  const result = mapper.nextReleaseState(
    { changeState: 'Authorize', changeApproval: 'requested' },
    'awaiting_approval',
  );
  assert.equal(result.matched, true);
  assert.equal(result.changed, false);
  assert.equal(result.releaseState, 'awaiting_approval');
});
