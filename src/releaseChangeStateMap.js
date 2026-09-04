import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_MAP_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
  'release-change-state-map.json',
);

export function loadStateMap(path = DEFAULT_MAP_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
}

function buildLookup(entries) {
  const lookup = new Map();
  for (const [key, def] of Object.entries(entries)) {
    const tokens = [key, def.value, ...(def.aliases ?? [])];
    for (const token of tokens) {
      lookup.set(normalize(token), key);
    }
  }
  return lookup;
}

export function createMapper(stateMap = loadStateMap()) {
  const stateLookup = buildLookup(stateMap.change.states);
  const approvalLookup = buildLookup(stateMap.change.approvals);

  function resolveChangeState(raw) {
    return stateLookup.get(normalize(raw)) ?? null;
  }

  function resolveChangeApproval(raw) {
    if (raw == null || String(raw).trim() === '') {
      return 'not_requested';
    }
    return approvalLookup.get(normalize(raw)) ?? null;
  }

  function matchRule(rule, changeStateKey, changeApprovalKey) {
    const when = rule.when ?? {};
    const states = when.changeState ?? [];
    if (states.length && !states.includes(changeStateKey)) {
      return false;
    }
    const approvals = when.changeApproval;
    if (approvals && approvals.length) {
      if (!changeApprovalKey || !approvals.includes(changeApprovalKey)) {
        return false;
      }
    }
    return true;
  }

  function mapChangeToRelease({ changeState, changeApproval } = {}) {
    const changeStateKey = resolveChangeState(changeState);
    if (!changeStateKey) {
      return {
        matched: false,
        reason: 'unknown_change_state',
        changeState: changeState ?? null,
        changeApproval: changeApproval ?? null,
        releaseState: null,
        releaseStateValue: null,
        releaseStateLabel: null,
        ruleId: null,
      };
    }

    const changeApprovalKey = resolveChangeApproval(changeApproval);

    for (const rule of stateMap.rules) {
      if (!matchRule(rule, changeStateKey, changeApprovalKey)) {
        continue;
      }
      const releaseDef = stateMap.release.states[rule.releaseState];
      return {
        matched: true,
        reason: 'mapped',
        changeState: changeStateKey,
        changeApproval: changeApprovalKey,
        releaseState: rule.releaseState,
        releaseStateValue: releaseDef?.value ?? rule.releaseState,
        releaseStateLabel: releaseDef?.label ?? rule.releaseState,
        ruleId: rule.id,
      };
    }

    return {
      matched: false,
      reason: 'no_matching_rule',
      changeState: changeStateKey,
      changeApproval: changeApprovalKey,
      releaseState: null,
      releaseStateValue: null,
      releaseStateLabel: null,
      ruleId: null,
    };
  }

  /**
   * Always project from the current Change snapshot.
   * If the Change moves backward, the Release follows the same mapping.
   */
  function nextReleaseState(changeSnapshot, currentReleaseState) {
    const mapped = mapChangeToRelease(changeSnapshot);
    if (!mapped.matched) {
      return {
        ...mapped,
        changed: false,
        previousReleaseState: currentReleaseState ?? null,
      };
    }

    const previous = currentReleaseState == null ? null : normalize(currentReleaseState);
    const next = normalize(mapped.releaseStateValue);
    return {
      ...mapped,
      changed: previous !== next,
      previousReleaseState: currentReleaseState ?? null,
    };
  }

  return {
    stateMap,
    mapChangeToRelease,
    nextReleaseState,
    resolveChangeState,
    resolveChangeApproval,
  };
}

export const defaultMapper = createMapper();
export const mapChangeToRelease = defaultMapper.mapChangeToRelease;
export const nextReleaseState = defaultMapper.nextReleaseState;
