/**
 * Pure policy for Change → Release state sync.
 * ServiceNow calls DecisionTableAPI; this module encodes the same branch rules
 * so they can be unit-tested without an instance.
 */
export function resolveReleaseState({ hasParent, mappedReleaseState, draftState }) {
  if (!hasParent) {
    return { state: draftState, applied: true, reason: 'no_parent' };
  }

  if (mappedReleaseState === null || mappedReleaseState === undefined || mappedReleaseState === '') {
    return { state: null, applied: false, reason: 'no_mapping' };
  }

  return { state: mappedReleaseState, applied: true, reason: 'decision_table' };
}

export function shouldApplyOnReleaseUpdate({ isNewRecord, parentChanged, syncRunning }) {
  if (syncRunning) {
    return false;
  }
  if (isNewRecord) {
    return true;
  }
  return !!parentChanged;
}

export function shouldSyncFromChange({ stateChanged, actionAborted, syncRunning }) {
  if (actionAborted || syncRunning) {
    return false;
  }
  return !!stateChanged;
}

/** Documented rows from Decision Table "Release to Change state mapping". */
export const DOCUMENTED_MAPPINGS = [
  { changeStateLabel: 'Authorize', releaseStateLabel: 'Awaiting Approval' },
  { changeStateLabel: 'Implemented - Full - Pending Requestor', releaseStateLabel: 'Deploy/Launch' },
  { changeStateLabel: 'Implemented - Partial - Pending Requestor', releaseStateLabel: 'Deploy/Launch' },
  { changeStateLabel: 'Authorize Approval', releaseStateLabel: 'Awaiting Approval' },
  { changeStateLabel: 'Closed', releaseStateLabel: 'Closed Complete' },
  { changeStateLabel: 'Closed - Backed Out', releaseStateLabel: 'Closed' },
  { changeStateLabel: 'Closed - Failed per Requestor Update - Full', releaseStateLabel: 'Closed' },
];
