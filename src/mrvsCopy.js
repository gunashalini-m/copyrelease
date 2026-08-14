/**
 * Pure helpers that match the ServiceNow Copy Release MRVS remapping rules.
 * The UI Action itself lives in servicenow/copy_release_ui_action.js (ES5 / GlideRecord).
 */

export function remapMrvsParentId(oldParent, originalSysId, newReleaseId, qaSysIdMap) {
  if (oldParent === originalSysId) {
    return newReleaseId;
  }
  if (oldParent && qaSysIdMap[oldParent]) {
    return qaSysIdMap[oldParent];
  }
  return newReleaseId;
}

export function remapQuestionAnswer(oldQaLink, qaSysIdMap, fallbackQaId) {
  if (oldQaLink && qaSysIdMap[oldQaLink]) {
    return qaSysIdMap[oldQaLink];
  }
  return fallbackQaId || "";
}

export function rebuildMrvsJsonFromCells(cells) {
  const byRow = new Map();

  for (const cell of cells) {
    if (!byRow.has(cell.row_index)) {
      byRow.set(cell.row_index, {});
    }
    if (cell.name) {
      byRow.get(cell.row_index)[cell.name] = cell.value || "";
    }
  }

  return JSON.stringify([...byRow.values()]);
}
