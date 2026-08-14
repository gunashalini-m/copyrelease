import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  rebuildMrvsJsonFromCells,
  remapMrvsParentId,
  remapQuestionAnswer,
  shouldOmitVariable,
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

test('omits named standalone variables and whole variable sets', () => {
  const omit = {
    omitVariables: ['release_manager'],
    omitVariableSets: ['agile_contact'],
    omitSetColumns: {
      agile_implementation_plan: ['planned_start_time', 'planned_end_time'],
    },
  };

  assert.equal(
    shouldOmitVariable({ variableName: 'release_manager', ...omit }),
    true,
  );
  assert.equal(
    shouldOmitVariable({ variableName: 'short_notes', setInternalName: 'agile_contact', ...omit }),
    true,
  );
  assert.equal(
    shouldOmitVariable({
      variableName: 'team_responsible',
      setInternalName: 'agile_implementation_plan',
      ...omit,
    }),
    false,
  );
});

test('omits only listed columns inside a variable set', () => {
  const omit = {
    omitVariables: [],
    omitVariableSets: [],
    omitSetColumns: {
      agile_implementation_plan: ['planned_start_time', 'planned_end_time'],
    },
    asSetColumn: true,
  };

  assert.equal(
    shouldOmitVariable({
      variableName: 'planned_start_time',
      setInternalName: 'agile_implementation_plan',
      ...omit,
    }),
    true,
  );
  assert.equal(
    shouldOmitVariable({
      variableName: 'team_responsible',
      setInternalName: 'agile_implementation_plan',
      ...omit,
    }),
    false,
  );
});

test('rebuilds MRVS JSON without omitted columns', () => {
  const json = rebuildMrvsJsonFromCells(
    [
      { row_index: '1', name: 'application', value: 'ServiceNow' },
      { row_index: '1', name: 'validator', value: 'Dharani' },
      { row_index: '2', name: 'application', value: 'ServiceNow' },
      { row_index: '2', name: 'validator', value: 'Keturah' },
    ],
    ['validator'],
  );

  assert.deepEqual(JSON.parse(json), [
    { application: 'ServiceNow' },
    { application: 'ServiceNow' },
  ]);
});
