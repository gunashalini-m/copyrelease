import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  rebuildMrvsJsonFromCells,
  remapMrvsParentId,
  remapQuestionAnswer,
} from '../src/mrvsCopy.js';

test('parent_id pointing at the release is remapped to the copy', () => {
  assert.equal(
    remapMrvsParentId('rel-old', 'rel-old', 'rel-new', {}),
    'rel-new',
  );
});

test('parent_id pointing at a question_answer is remapped via the QA map', () => {
  assert.equal(
    remapMrvsParentId('qa-old', 'rel-old', 'rel-new', { 'qa-old': 'qa-new' }),
    'qa-new',
  );
});

test('question_answer on MRVS cells is remapped; otherwise uses fallback', () => {
  assert.equal(
    remapQuestionAnswer('qa-old', { 'qa-old': 'qa-new' }, ''),
    'qa-new',
  );
  assert.equal(
    remapQuestionAnswer('', { 'qa-old': 'qa-new' }, 'qa-fallback'),
    'qa-fallback',
  );
});

test('MRVS formatter JSON is rebuilt from cell rows in row_index order', () => {
  const json = rebuildMrvsJsonFromCells([
    { row_index: '1', name: 'application', value: 'ServiceNow' },
    { row_index: '1', name: 'change_description', value: 'Test1' },
    { row_index: '2', name: 'application', value: 'ServiceNow' },
    { row_index: '2', name: 'change_description', value: 'Test2' },
  ]);

  assert.deepEqual(JSON.parse(json), [
    { application: 'ServiceNow', change_description: 'Test1' },
    { application: 'ServiceNow', change_description: 'Test2' },
  ]);
});
