import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DOCUMENTED_MAPPINGS,
  resolveReleaseState,
  shouldApplyOnReleaseUpdate,
  shouldSyncFromChange,
} from '../src/changeReleaseStatePolicy.js';

const DRAFT = 'draft';

test('release without parent is Draft', () => {
  const result = resolveReleaseState({
    hasParent: false,
    mappedReleaseState: 'awaiting_approval',
    draftState: DRAFT,
  });
  assert.equal(result.state, DRAFT);
  assert.equal(result.reason, 'no_parent');
  assert.equal(result.applied, true);
});

test('release with parent uses Decision Table result', () => {
  const result = resolveReleaseState({
    hasParent: true,
    mappedReleaseState: 'deploy_launch',
    draftState: DRAFT,
  });
  assert.equal(result.state, 'deploy_launch');
  assert.equal(result.reason, 'decision_table');
});

test('unmapped change state does not overwrite release', () => {
  const result = resolveReleaseState({
    hasParent: true,
    mappedReleaseState: null,
    draftState: DRAFT,
  });
  assert.equal(result.state, null);
  assert.equal(result.applied, false);
  assert.equal(result.reason, 'no_mapping');
});

test('release BR runs on insert or parent change only', () => {
  assert.equal(
    shouldApplyOnReleaseUpdate({ isNewRecord: true, parentChanged: false, hasParent: true }),
    true
  );
  assert.equal(
    shouldApplyOnReleaseUpdate({ isNewRecord: false, parentChanged: true, hasParent: true }),
    true
  );
  assert.equal(
    shouldApplyOnReleaseUpdate({ isNewRecord: false, parentChanged: true, hasParent: false }),
    true
  );
  assert.equal(
    shouldApplyOnReleaseUpdate({ isNewRecord: false, parentChanged: false, hasParent: false }),
    false
  );
  assert.equal(
    shouldApplyOnReleaseUpdate({ isNewRecord: false, parentChanged: false, hasParent: true }),
    false
  );
  assert.equal(
    shouldApplyOnReleaseUpdate({ isNewRecord: true, parentChanged: true, syncRunning: true }),
    false
  );
});

test('change BR skips aborted actions and in-flight sync', () => {
  assert.equal(
    shouldSyncFromChange({ stateChanged: true, actionAborted: false, syncRunning: false }),
    true
  );
  assert.equal(
    shouldSyncFromChange({ stateChanged: false, actionAborted: false, syncRunning: false }),
    false
  );
  assert.equal(
    shouldSyncFromChange({ stateChanged: true, actionAborted: true, syncRunning: false }),
    false
  );
  assert.equal(
    shouldSyncFromChange({ stateChanged: true, actionAborted: false, syncRunning: true }),
    false
  );
});

test('documented decision rows cover Authorize through Closed variants', () => {
  assert.equal(DOCUMENTED_MAPPINGS.length, 7);
  assert.equal(
    DOCUMENTED_MAPPINGS.find((row) => row.changeStateLabel === 'Authorize').releaseStateLabel,
    'Awaiting Approval'
  );
  assert.equal(
    DOCUMENTED_MAPPINGS.find((row) => row.changeStateLabel === 'Closed').releaseStateLabel,
    'Closed Complete'
  );
});
