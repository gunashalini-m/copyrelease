import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  blankListedMrvsColumns,
  copiedValue,
  rebuildMrvsJsonFromCells,
  remapMrvsParentId,
  remapQuestionAnswer,
  shouldClearVariable,
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

test('clears named standalone variables and whole variable sets', () => {
  const clear = {
    omitVariables: ['release_manager'],
    omitVariableSets: ['agile_contact'],
    omitSetColumns: {
      agile_implementation_plan: ['planned_start_time', 'planned_end_time'],
    },
  };

  assert.equal(
    shouldClearVariable({ variableName: 'release_manager', ...clear }),
    true,
  );
  assert.equal(
    shouldClearVariable({ variableName: 'short_notes', setInternalName: 'agile_contact', ...clear }),
    true,
  );
  assert.equal(
    shouldClearVariable({
      variableName: 'team_responsible',
      setInternalName: 'agile_implementation_plan',
      ...clear,
    }),
    false,
  );
});

test('clears only listed columns inside a variable set', () => {
  const clear = {
    omitVariables: [],
    omitVariableSets: [],
    omitSetColumns: {
      agile_implementation_plan: ['planned_start_time', 'planned_end_time'],
    },
    asSetColumn: true,
  };

  assert.equal(
    shouldClearVariable({
      variableName: 'planned_start_time',
      setInternalName: 'agile_implementation_plan',
      ...clear,
    }),
    true,
  );
  assert.equal(
    shouldClearVariable({
      variableName: 'team_responsible',
      setInternalName: 'agile_implementation_plan',
      ...clear,
    }),
    false,
  );
});

test('clears change_request and agile implementation plan times but keeps the questions', () => {
  assert.equal(
    shouldClearVariable({ variableName: 'change_request', omitVariables: ['change_request'] }),
    true,
  );
  assert.equal(
    shouldClearVariable({
      variableName: 'planned_start_time',
      setInternalName: 'u_agile_implementation_plan',
      omitSetColumns: {
        u_agile_implementation_plan: ['planned_start_time', 'planned_end_time'],
      },
      asSetColumn: true,
    }),
    true,
  );
  assert.equal(
    shouldClearVariable({
      variableName: 'planned_end_time',
      setInternalName: 'u_agile_implementation_plan',
      omitSetColumns: {
        u_agile_implementation_plan: ['planned_start_time', 'planned_end_time'],
      },
      asSetColumn: true,
    }),
    true,
  );
  assert.equal(
    shouldClearVariable({
      variableName: 'team_responsible',
      setInternalName: 'u_agile_implementation_plan',
      omitSetColumns: {
        u_agile_implementation_plan: ['planned_start_time', 'planned_end_time'],
      },
      asSetColumn: true,
    }),
    false,
  );
});

test('blanks only listed MRVS JSON keys and leaves other sets unchanged', () => {
  const implementation = JSON.stringify([
    {
      sequence_number: '1',
      team_responsible: 'ServiceNow',
      planned_start_time: '2026-08-13 05:35:28',
      planned_end_time: '2026-08-14 05:35:30',
      steps_to_be_executed: 'Test Test Test',
    },
  ]);
  const validation = JSON.stringify([
    {
      application: 'ServiceNow',
      change_description: 'Test1',
      validator: 'Dharani',
    },
  ]);
  const clearSetColumns = {
    u_agile_implementation_plan: ['planned_start_time', 'planned_end_time'],
  };

  assert.deepEqual(
    JSON.parse(
      blankListedMrvsColumns(
        implementation,
        'u_agile_implementation_plan',
        'u_agile_implementation_plan',
        clearSetColumns,
      ),
    ),
    [
      {
        sequence_number: '1',
        team_responsible: 'ServiceNow',
        planned_start_time: '',
        planned_end_time: '',
        steps_to_be_executed: 'Test Test Test',
      },
    ],
  );
  assert.equal(
    blankListedMrvsColumns(
      validation,
      'u_agile_production_validation_plan',
      'u_agile_production_validation_plan',
      clearSetColumns,
    ),
    validation,
  );
});

test('keeps cleared MRVS columns present with empty values', () => {
  assert.equal(copiedValue(true, 'Dharani'), '');
  assert.equal(copiedValue(false, 'Dharani'), 'Dharani');

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
    { application: 'ServiceNow', validator: '' },
    { application: 'ServiceNow', validator: '' },
  ]);
});
