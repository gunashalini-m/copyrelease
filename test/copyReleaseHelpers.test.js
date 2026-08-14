import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyVariableClears,
  clearMrvsJsonValue,
  getMrvsParentAnswers,
  resolveCopiedParentId,
  resolveCopiedQuestionAnswerId,
  shouldClearMrvsColumn,
} from '../src/copyReleaseHelpers.js';

const variablesToClear = { change_request: true };
const mrvsColumnsToClear = {
  u_agile_implementation_plan: {
    planned_start_time: true,
    planned_end_time: true,
  },
};

test('clears configured scalar variables', () => {
  assert.equal(
    applyVariableClears('CHG0010001', 'change_request', '', variablesToClear, mrvsColumnsToClear),
    '',
  );
  assert.equal(
    applyVariableClears('keep-me', 'short_description', '', variablesToClear, mrvsColumnsToClear),
    'keep-me',
  );
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

test('clears MRVS JSON columns even when set name does not match', () => {
  const jsonValue = JSON.stringify([
    { planned_start_time: 'a', planned_end_time: 'b', owner: 'c' },
  ]);

  const rows = JSON.parse(clearMrvsJsonValue(jsonValue, '', mrvsColumnsToClear));

  assert.equal(rows[0].planned_start_time, '');
  assert.equal(rows[0].planned_end_time, '');
  assert.equal(rows[0].owner, 'c');
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
  assert.equal(
    resolveCopiedParentId('missing', 'originalRelease', 'copiedRelease', copiedAnswerByOriginalId),
    'copiedRelease',
  );
});

test('maps MRVS question_answer via copied id, then variable set, then single MRVS', () => {
  const copiedAnswerByOriginalId = { originalAnswer: 'copiedAnswer' };
  const mrvsParentAnswers = {
    byVariableSet: { variableSet1: 'parentAnswerForSet' },
    onlyMrvsParentId: 'onlyMrvsParent',
  };

  assert.equal(
    resolveCopiedQuestionAnswerId(
      'originalAnswer',
      copiedAnswerByOriginalId,
      mrvsParentAnswers,
      'variableSet1',
    ),
    'copiedAnswer',
  );
  assert.equal(
    resolveCopiedQuestionAnswerId('', copiedAnswerByOriginalId, mrvsParentAnswers, 'variableSet1'),
    'parentAnswerForSet',
  );
  assert.equal(
    resolveCopiedQuestionAnswerId('', copiedAnswerByOriginalId, mrvsParentAnswers, 'unknownSet'),
    'onlyMrvsParent',
  );
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
