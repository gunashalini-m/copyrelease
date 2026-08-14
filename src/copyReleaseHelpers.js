/**
 * Pure helpers matching servicenow/copy_release_ui_action.js.
 * ServiceNow cannot import this module; keep both in sync.
 */

export const TYPE_MRVS = '21';

export function isMrvsVariable(variable) {
  return String(variable && variable.type) === TYPE_MRVS;
}

export function applyVariableClears(value, variable, variablesToClear, mrvsColumnsToClear) {
  if (variablesToClear[variable.name] && !isMrvsVariable(variable)) {
    return '';
  }
  return clearMrvsJsonValue(value, variable.variableSetName || variable.name, mrvsColumnsToClear);
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

export function resolveMrvsParentQa(questionMap, variablesByQuestionId, variableSetId) {
  let fallback = '';
  let type21Count = 0;

  for (const questionId of Object.keys(questionMap)) {
    const variable = variablesByQuestionId[questionId] || {};
    if (!isMrvsVariable(variable)) {
      continue;
    }
    if (variableSetId && variable.variableSetId === variableSetId) {
      return questionMap[questionId];
    }
    fallback = questionMap[questionId];
    type21Count += 1;
  }

  return type21Count === 1 ? fallback : '';
}

export function getMrvsParentAnswers(copiedAnswerByQuestionId, variablesByQuestionId) {
  const byVariableSet = {};
  const mrvsParentIds = [];

  for (const questionId of Object.keys(copiedAnswerByQuestionId)) {
    const variable = variablesByQuestionId[questionId] || {};
    if (!isMrvsVariable(variable)) {
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
