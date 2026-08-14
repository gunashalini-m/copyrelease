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

export function shouldOmitVariable({
  variableName,
  setInternalName,
  omitVariables = [],
  omitVariableSets = [],
  omitSetColumns = {},
  asSetColumn = false,
}) {
  if (variableName && omitVariables.includes(variableName)) {
    return true;
  }
  if (setInternalName && omitVariableSets.includes(setInternalName)) {
    return true;
  }
  if (asSetColumn && setInternalName && variableName) {
    const columns = omitSetColumns[setInternalName] || [];
    if (columns.includes(variableName)) {
      return true;
    }
  }
  return false;
}

export function rebuildMrvsJsonFromCells(cells, omitColumnNames = []) {
  const skip = new Set(omitColumnNames);
  const byRow = new Map();

  for (const cell of cells) {
    if (!cell.name || skip.has(cell.name)) {
      continue;
    }
    if (!byRow.has(cell.row_index)) {
      byRow.set(cell.row_index, {});
    }
    byRow.get(cell.row_index)[cell.name] = cell.value || "";
  }

  return JSON.stringify([...byRow.values()]);
}
