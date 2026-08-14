/**
 * Pure helpers shared with the Copy Release UI Action
 * (servicenow/copy_release_ui_action.js). ServiceNow cannot import this
 * module; keep both implementations in sync.
 */

export function clearAnswerValue(value, variableName, variableSetName, clearVars, clearMrvs) {
  if (clearVars[variableName]) {
    return '';
  }
  return clearMrvsJson(value, variableSetName, clearMrvs);
}

export function clearMrvsJson(value, setName, clearMrvs) {
  if (!value || value.charAt(0) !== '[') {
    return value;
  }

  let rows;
  try {
    rows = JSON.parse(value);
  } catch {
    return value;
  }

  if (!Array.isArray(rows) || rows.length === 0 || typeof rows[0] !== 'object' || rows[0] === null) {
    return value;
  }

  const cols = columnsToClear(setName, clearMrvs, rows[0]);
  if (!cols) {
    return value;
  }

  for (const row of rows) {
    for (const col of Object.keys(cols)) {
      if (Object.prototype.hasOwnProperty.call(row, col)) {
        row[col] = '';
      }
    }
  }

  return JSON.stringify(rows);
}

export function columnsToClear(setName, clearMrvs, sampleRow) {
  if (clearMrvs[setName]) {
    return clearMrvs[setName];
  }

  const merged = {};
  let found = false;
  for (const set of Object.keys(clearMrvs)) {
    for (const col of Object.keys(clearMrvs[set])) {
      if (Object.prototype.hasOwnProperty.call(sampleRow, col)) {
        merged[col] = true;
        found = true;
      }
    }
  }
  return found ? merged : null;
}

export function resolveMrvsParent(oldParent, srcId, dstId, qaMap) {
  return oldParent === srcId ? dstId : qaMap[oldParent] || dstId;
}

export function resolveMrvsQuestionAnswer(oldQa, qaMap, setQaMap, variableSetId) {
  return qaMap[oldQa] || setQaMap[variableSetId] || setQaMap._single || '';
}

export function buildSetQaMap(questionMap, variablesByQuestionId) {
  const map = { _single: '' };
  const type21 = [];

  for (const qid of Object.keys(questionMap)) {
    const variable = variablesByQuestionId[qid] || {};
    if (String(variable.type) !== '21') {
      continue;
    }
    if (variable.variableSetId) {
      map[variable.variableSetId] = questionMap[qid];
    }
    type21.push(questionMap[qid]);
  }

  if (type21.length === 1) {
    map._single = type21[0];
  }

  return map;
}

export function shouldClearMrvsColumn(variableSetName, columnName, clearMrvs) {
  return Boolean(clearMrvs[variableSetName] && clearMrvs[variableSetName][columnName]);
}
