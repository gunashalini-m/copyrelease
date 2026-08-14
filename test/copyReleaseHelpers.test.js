import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildSetQaMap,
  clearAnswerValue,
  clearMrvsJson,
  resolveMrvsParent,
  resolveMrvsQuestionAnswer,
  shouldClearMrvsColumn,
} from '../src/copyReleaseHelpers.js';

const CLEAR_VARS = { change_request: true };
const CLEAR_MRVS = {
  u_agile_implementation_plan: {
    planned_start_time: true,
    planned_end_time: true,
  },
};

test('clears configured scalar variables', () => {
  assert.equal(
    clearAnswerValue('CHG0010001', 'change_request', '', CLEAR_VARS, CLEAR_MRVS),
    '',
  );
  assert.equal(
    clearAnswerValue('keep-me', 'short_description', '', CLEAR_VARS, CLEAR_MRVS),
    'keep-me',
  );
});

test('clears configured MRVS date columns in JSON', () => {
  const value = JSON.stringify([
    {
      task: 'impl-1',
      planned_start_time: '2026-01-01 09:00:00',
      planned_end_time: '2026-01-02 17:00:00',
    },
  ]);

  const cleared = clearMrvsJson(value, 'u_agile_implementation_plan', CLEAR_MRVS);
  const rows = JSON.parse(cleared);

  assert.equal(rows[0].task, 'impl-1');
  assert.equal(rows[0].planned_start_time, '');
  assert.equal(rows[0].planned_end_time, '');
});

test('clears MRVS JSON columns even when set name does not match', () => {
  const value = JSON.stringify([
    { planned_start_time: 'a', planned_end_time: 'b', owner: 'c' },
  ]);

  const cleared = clearMrvsJson(value, '', CLEAR_MRVS);
  const rows = JSON.parse(cleared);

  assert.equal(rows[0].planned_start_time, '');
  assert.equal(rows[0].planned_end_time, '');
  assert.equal(rows[0].owner, 'c');
});

test('leaves invalid JSON unchanged', () => {
  assert.equal(clearMrvsJson('[not-json', 'u_agile_implementation_plan', CLEAR_MRVS), '[not-json');
});

test('maps MRVS parent_id to the new release or copied QA', () => {
  const qaMap = { oldQa: 'newQa' };
  assert.equal(resolveMrvsParent('rel1', 'rel1', 'rel2', qaMap), 'rel2');
  assert.equal(resolveMrvsParent('oldQa', 'rel1', 'rel2', qaMap), 'newQa');
  assert.equal(resolveMrvsParent('missing', 'rel1', 'rel2', qaMap), 'rel2');
});

test('maps MRVS question_answer via qaMap, then variable-set, then single type-21', () => {
  const qaMap = { oldQa: 'copiedQa' };
  const setQaMap = { set1: 'setQa', _single: 'onlyMrvsQa' };

  assert.equal(resolveMrvsQuestionAnswer('oldQa', qaMap, setQaMap, 'set1'), 'copiedQa');
  assert.equal(resolveMrvsQuestionAnswer('', qaMap, setQaMap, 'set1'), 'setQa');
  assert.equal(resolveMrvsQuestionAnswer('', qaMap, setQaMap, 'unknown'), 'onlyMrvsQa');
});

test('buildSetQaMap prefers type 21 variables and records a single-MRVS fallback', () => {
  const questionMap = {
    colQ: 'qaCol',
    mrvsQ: 'qaMrvs',
  };
  const variables = {
    colQ: { type: '6', variableSetId: 'set1' },
    mrvsQ: { type: '21', variableSetId: 'set1' },
  };

  const map = buildSetQaMap(questionMap, variables);
  assert.equal(map.set1, 'qaMrvs');
  assert.equal(map._single, 'qaMrvs');
});

test('shouldClearMrvsColumn only matches configured set + column', () => {
  assert.equal(
    shouldClearMrvsColumn('u_agile_implementation_plan', 'planned_start_time', CLEAR_MRVS),
    true,
  );
  assert.equal(
    shouldClearMrvsColumn('u_agile_implementation_plan', 'task', CLEAR_MRVS),
    false,
  );
});
