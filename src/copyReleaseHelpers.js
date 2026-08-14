/**
 * Pure helpers matching servicenow/copy_release_ui_action.js.
 * ServiceNow cannot import this module; keep both in sync.
 */

export function applyVariableClears(
  value,
  variableName,
  variableSetName,
  variablesToClear,
  mrvsColumnsToClear,
) {
  if (variablesToClear[variableName]) {
    return '';
  }
  return clearMrvsJsonValue(value, variableSetName, mrvsColumnsToClear);
}

export function clearMrvsJsonValue(jsonValue, variableSetName, mrvsColumnsToClear) {
  if (!jsonValue || jsonValue.charAt(0) !== '[') {
    return jsonValue;
  }

  let rows;
  try {
    rows = JSON.parse(jsonValue);
  } catch {
    return jsonValue;
  }

  if (!Array.isArray(rows) || rows.length === 0 || typeof rows[0] !== 'object' || rows[0] === null) {
    return jsonValue;
  }

  const columns =
    mrvsColumnsToClear[variableSetName] || matchingClearColumns(rows[0], mrvsColumnsToClear);
  if (!columns) {
    return jsonValue;
  }

  for (const row of rows) {
    for (const columnName of Object.keys(columns)) {
      if (Object.prototype.hasOwnProperty.call(row, columnName)) {
        row[columnName] = '';
      }
    }
  }

  return JSON.stringify(rows);
}

export function matchingClearColumns(sampleRow, mrvsColumnsToClear) {
  const columns = {};
  let found = false;

  for (const variableSetName of Object.keys(mrvsColumnsToClear)) {
    for (const columnName of Object.keys(mrvsColumnsToClear[variableSetName])) {
      if (Object.prototype.hasOwnProperty.call(sampleRow, columnName)) {
        columns[columnName] = true;
        found = true;
      }
    }
  }

  return found ? columns : null;
}

export function resolveCopiedParentId(originalParentId, originalSysId, newReleaseSysId, copiedAnswerByOriginalId) {
  return originalParentId === originalSysId
    ? newReleaseSysId
    : copiedAnswerByOriginalId[originalParentId] || newReleaseSysId;
}

export function resolveCopiedQuestionAnswerId(
  originalAnswerId,
  copiedAnswerByOriginalId,
  mrvsParentAnswers,
  variableSetId,
) {
  return (
    copiedAnswerByOriginalId[originalAnswerId] ||
    mrvsParentAnswers.byVariableSet[variableSetId] ||
    mrvsParentAnswers.onlyMrvsParentId ||
    ''
  );
}

export function getMrvsParentAnswers(copiedAnswerByQuestionId, variablesByQuestionId) {
  const byVariableSet = {};
  const mrvsParentIds = [];

  for (const questionId of Object.keys(copiedAnswerByQuestionId)) {
    const variable = variablesByQuestionId[questionId] || {};
    if (String(variable.type) !== '21') {
      continue;
    }

    const copiedAnswerSysId = copiedAnswerByQuestionId[questionId];
    if (variable.variableSetId) {
      byVariableSet[variable.variableSetId] = copiedAnswerSysId;
    }
    mrvsParentIds.push(copiedAnswerSysId);
  }

  return {
    byVariableSet,
    onlyMrvsParentId: mrvsParentIds.length === 1 ? mrvsParentIds[0] : '',
  };
}

export function shouldClearMrvsColumn(variableSetName, columnName, mrvsColumnsToClear) {
  return Boolean(mrvsColumnsToClear[variableSetName] && mrvsColumnsToClear[variableSetName][columnName]);
}
