import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAP_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'release-change-state-map.json');

export function loadStateMap(path = MAP_FILE) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function clean(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
}

function lookupChangeState(map, raw) {
  const token = clean(raw);
  if (!token) {
    return null;
  }

  const values = map.changeStateValues;
  if (values[token]) {
    return token;
  }

  for (const [name, snValue] of Object.entries(values)) {
    if (clean(snValue) === token) {
      return name;
    }
  }

  return map.changeStateAliases[token] || null;
}

function lookupApproval(raw) {
  if (raw == null || String(raw).trim() === '') {
    return '';
  }
  return clean(raw);
}

function isPendingApproval(map, approval) {
  const pending = map.authorizeAndApproval.pendingApprovals.map(clean);
  return pending.includes(approval);
}

function pack(map, changeState, changeApproval, releaseKey) {
  return {
    matched: true,
    reason: 'mapped',
    changeState,
    changeApproval: changeApproval || 'not_requested',
    releaseState: releaseKey,
    releaseStateValue: map.releaseStateValues[releaseKey] || releaseKey,
    releaseStateLabel: map.releaseStateLabels[releaseKey] || releaseKey,
  };
}

function miss(reason, changeState, changeApproval) {
  return {
    matched: false,
    reason,
    changeState: changeState ?? null,
    changeApproval: changeApproval ?? null,
    releaseState: null,
    releaseStateValue: null,
    releaseStateLabel: null,
  };
}

/**
 * Pick the Release state from the Change as it stands now.
 * Call this again whenever state or approval changes; going backwards is fine.
 */
export function mapChangeToRelease(input = {}, map = loadStateMap()) {
  const changeState = lookupChangeState(map, input.changeState);
  if (!changeState) {
    return miss('unknown_change_state', input.changeState, input.changeApproval);
  }

  const changeApproval = lookupApproval(input.changeApproval);
  const auth = map.authorizeAndApproval;

  if (auth.changeStates.includes(changeState)) {
    if (!isPendingApproval(map, changeApproval) && changeApproval === 'approved') {
      return pack(map, changeState, changeApproval, auth.releaseWhenApproved);
    }
    return pack(map, changeState, changeApproval, auth.releaseWhenPending);
  }

  const releaseKey = map.map[changeState];
  if (!releaseKey) {
    return miss('no_matching_rule', changeState, changeApproval);
  }
  return pack(map, changeState, changeApproval, releaseKey);
}

export function nextReleaseState(changeSnapshot, currentReleaseState, map = loadStateMap()) {
  const mapped = mapChangeToRelease(changeSnapshot, map);
  if (!mapped.matched) {
    return {
      ...mapped,
      changed: false,
      previousReleaseState: currentReleaseState ?? null,
    };
  }

  const same = clean(currentReleaseState) === clean(mapped.releaseStateValue);
  return {
    ...mapped,
    changed: currentReleaseState == null ? true : !same,
    previousReleaseState: currentReleaseState ?? null,
  };
}

const defaultMap = loadStateMap();

export const defaultMapper = {
  stateMap: defaultMap,
  mapChangeToRelease: (snapshot) => mapChangeToRelease(snapshot, defaultMap),
  nextReleaseState: (snapshot, current) => nextReleaseState(snapshot, current, defaultMap),
};

export function createMapper(stateMap = loadStateMap()) {
  return {
    stateMap,
    mapChangeToRelease: (snapshot) => mapChangeToRelease(snapshot, stateMap),
    nextReleaseState: (snapshot, current) => nextReleaseState(snapshot, current, stateMap),
  };
}
