import assert from 'node:assert/strict';
import { test } from 'node:test';
import { grade, stripComments } from '../src/lib/grader.js';
import { TOPICS, allQuestions } from '../src/lib/questions/index.js';
import { SNOW_CLASSES, SNOW_SNIPPETS } from '../src/lib/snow-api.js';

test('ServiceNow API catalog loads with snippets', () => {
  assert.ok(SNOW_CLASSES.GlideRecord.methods.length > 10);
  assert.ok(SNOW_SNIPPETS.some((item) => item.insertText.includes('GlideRecord')));
});

test('each ITSM topic has at least 15 questions', () => {
  assert.ok(TOPICS.length >= 10, 'expected core ITSM topics plus integrations');
  for (const topic of TOPICS) {
    assert.ok(
      topic.questions.length >= 15,
      `${topic.title} has ${topic.questions.length} questions`,
    );
  }
});

test('official solutions pass and starters fail', () => {
  for (const question of allQuestions()) {
    const pass = grade(question.solution, question.checks);
    assert.equal(pass.passed, true, `${question.id} solution should pass: ${JSON.stringify(pass.results.filter((r) => !r.ok))}`);
    const fail = grade(question.starter, question.checks);
    assert.equal(fail.passed, false, `${question.id} starter should not already pass`);
  }
});

test('commented-out solutions do not pass includes checks', () => {
  const checks = [{ type: 'includes', value: 'current.update()', message: 'update' }];
  assert.equal(grade('current.update();', checks).passed, true);
  assert.equal(grade('// current.update();', checks).passed, false);
  assert.match(stripComments('foo /* bar */ baz'), /foo\s+baz/);
});

test('grading is fast for a full solution set', () => {
  const started = performance.now();
  for (const question of allQuestions()) {
    grade(question.solution, question.checks);
  }
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 250, `graded all solutions in ${elapsed}ms`);
});
