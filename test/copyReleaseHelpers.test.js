import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyVariableClears,
  clearMrvsJsonValue,
  getMrvsParentAnswers,
  isMrvsVariable,
  resolveCopiedParentId,
  resolveMrvsParentQa,
  shouldClearMrvsColumn,
} from '../src/copyReleaseHelpers.js';

const variablesToClear = { change_request: true };
const mrvsColumnsToClear = {
  u_agile_implementation_plan: {
    planned_start_time: true,
    planned_end_time: true,
  },
};

test('clears configured scalar variables, not MRVS parents', () => {
  assert.equal(
    applyVariableClears('CHG0010001', { name: 'change_request', type: '7' }, variablesToClear, mrvsColumnsToClear),
    '',
  );
  assert.equal(
    applyVariableClears('keep-me', { name: 'short_description', type: '6' }, variablesToClear, mrvsColumnsToClear),
    'keep-me',
  );
});

test('clears MRVS JSON by column name, not by type 21', () => {
  const jsonValue = JSON.stringify([{ task: 'impl-1', planned_start_time: 'a' }]);
  const cleared = applyVariableClears(
    jsonValue,
    { name: 'u_agile_implementation_plan', type: '21', variableSetName: 'u_agile_implementation_plan' },
    variablesToClear,
    mrvsColumnsToClear,
  );
  const rows = JSON.parse(cleared);
  assert.equal(rows[0].task, 'impl-1');
  assert.equal(rows[0].planned_start_time, '');
});

test('clears configured MRVS date columns in JSON and keeps other fields', () => {
  const jsonValue = JSON.stringify([
    {
      task: 'impl-1',
      planned_start_time: '2026-01-01 09:00:00',
      planned_end_time: '2026-01-02 17:00:00',
    },
  ]);

  const rows = JSON.parse(
    clearMrvsJsonValue(jsonValue, 'u_agile_implementation_plan', mrvsColumnsToClear),
  );

  assert.equal(rows[0].task, 'impl-1');
  assert.equal(rows[0].planned_start_time, '');
  assert.equal(rows[0].planned_end_time, '');
});

test('leaves invalid JSON unchanged', () => {
  assert.equal(
    clearMrvsJsonValue('[not-json', 'u_agile_implementation_plan', mrvsColumnsToClear),
    '[not-json',
  );
});

test('maps MRVS parent_id to the new release or copied question answer', () => {
  const copiedAnswerByOriginalId = { originalAnswer: 'copiedAnswer' };
  assert.equal(
    resolveCopiedParentId('originalRelease', 'originalRelease', 'copiedRelease', copiedAnswerByOriginalId),
    'copiedRelease',
  );
  assert.equal(
    resolveCopiedParentId('originalAnswer', 'originalRelease', 'copiedRelease', copiedAnswerByOriginalId),
    'copiedAnswer',
  );
});

test('resolveMrvsParentQa uses type 21 only, never column variables', () => {
  const questionMap = {
    columnQuestion: 'columnAnswer',
    mrvsQuestion: 'mrvsParentAnswer',
  };
  const variables = {
    columnQuestion: { type: '6', variableSetId: 'variableSet1' },
    mrvsQuestion: { type: '21', variableSetId: 'variableSet1' },
  };

  assert.equal(resolveMrvsParentQa(questionMap, variables, 'variableSet1'), 'mrvsParentAnswer');
  assert.equal(isMrvsVariable(variables.columnQuestion), false);
  assert.equal(isMrvsVariable(variables.mrvsQuestion), true);
});

test('getMrvsParentAnswers uses type 21 variables, not MRVS columns', () => {
  const copiedAnswerByQuestionId = {
    columnQuestion: 'columnAnswer',
    mrvsQuestion: 'mrvsParentAnswer',
  };
  const variablesByQuestionId = {
    columnQuestion: { type: '6', variableSetId: 'variableSet1' },
    mrvsQuestion: { type: '21', variableSetId: 'variableSet1' },
  };

  const mrvsParentAnswers = getMrvsParentAnswers(copiedAnswerByQuestionId, variablesByQuestionId);
  assert.equal(mrvsParentAnswers.byVariableSet.variableSet1, 'mrvsParentAnswer');
  assert.equal(mrvsParentAnswers.onlyMrvsParentId, 'mrvsParentAnswer');
});

test('shouldClearMrvsColumn only matches configured set and column', () => {
  assert.equal(
    shouldClearMrvsColumn('u_agile_implementation_plan', 'planned_start_time', mrvsColumnsToClear),
    true,
  );
  assert.equal(shouldClearMrvsColumn('u_agile_implementation_plan', 'task', mrvsColumnsToClear), false);
});
