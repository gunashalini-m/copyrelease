import assert from 'node:assert/strict';
import { test } from 'node:test';
import { grade, gradeTheory, stripComments } from '../src/lib/grader.js';
import { TOPICS, allQuestions, allTheoryQuestions } from '../src/lib/questions/index.js';
import { SNOW_CLASSES, SNOW_SNIPPETS } from '../src/lib/snow-api.js';

test('ServiceNow API catalog loads with snippets', () => {
  assert.ok(SNOW_CLASSES.GlideRecord.methods.length > 10);
  assert.ok(SNOW_SNIPPETS.some((item) => item.insertText.includes('GlideRecord')));
});

test('each ITSM topic has 15 code and 15 theory questions', () => {
  assert.ok(TOPICS.length >= 10, 'expected core ITSM topics plus integrations');
  for (const topic of TOPICS) {
    assert.equal(topic.questions.length, 15, `${topic.title} code count`);
    assert.equal(topic.theory.length, 15, `${topic.title} theory count`);
  }
});

test('official code solutions pass and starters fail', () => {
  for (const question of allQuestions()) {
    const pass = grade(question.solution, question.checks);
    assert.equal(
      pass.passed,
      true,
      `${question.id} solution should pass: ${JSON.stringify(pass.results.filter((item) => !item.ok))}`,
    );
    const fail = grade(question.starter, question.checks);
    assert.equal(fail.passed, false, `${question.id} starter should not already pass`);
  }
});

test('theory answers match options and grade correctly', () => {
  for (const question of allTheoryQuestions()) {
    const ids = new Set(question.options.map((option) => option.id));
    const answers = [].concat(question.answer);
    assert.ok(answers.length > 0, `${question.id} missing answer`);
    for (const answer of answers) {
      assert.ok(ids.has(answer), `${question.id} answer ${answer} not in options`);
    }
    const correct = gradeTheory(question.answer, question);
    assert.equal(correct.passed, true, `${question.id} correct answer should pass`);
    const wrongId = question.options.find((option) => !answers.includes(option.id))?.id;
    if (wrongId) {
      assert.equal(gradeTheory(wrongId, question).passed, false, `${question.id} wrong answer should fail`);
    }
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
  for (const question of allTheoryQuestions()) {
    gradeTheory(question.answer, question);
  }
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 250, `graded all solutions in ${elapsed}ms`);
});
