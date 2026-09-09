import assert from 'node:assert/strict';
import { test } from 'node:test';
import { grade, gradeTheory, stripComments } from '../src/lib/grader.js';
import { TOPICS, EXAMS, allQuestions, allTheoryQuestions, getQuestion } from '../src/lib/questions/index.js';
import { SNOW_CLASSES, SNOW_SNIPPETS } from '../src/lib/snow-api.js';

test('ServiceNow API catalog loads with snippets', () => {
  assert.ok(SNOW_CLASSES.GlideRecord.methods.length > 10);
  assert.ok(SNOW_SNIPPETS.some((item) => item.insertText.includes('GlideRecord')));
});

test('practice bank includes ACLs and at least 15 code and theory per topic', () => {
  assert.ok(TOPICS.length >= 11, 'expected ITSM topics plus integrations and ACLs');
  assert.ok(TOPICS.some((topic) => topic.id === 'acl'));
  for (const topic of TOPICS) {
    assert.ok(topic.questions.length >= 15, `${topic.title} code count`);
    assert.ok(topic.theory.length >= 15, `${topic.title} theory count`);
  }
  const acl = TOPICS.find((topic) => topic.id === 'acl');
  assert.ok(acl.questions.length >= 20);
  assert.ok(acl.theory.length >= 20);
});

test('at least five exams mix code and theory and cover the full bank', () => {
  assert.ok(EXAMS.length >= 5, `expected 5+ exams, got ${EXAMS.length}`);
  const full = EXAMS.find((exam) => exam.id === 'exam-full');
  const security = EXAMS.find((exam) => exam.id === 'exam-security');
  const coding = EXAMS.find((exam) => exam.id === 'exam-dev');
  const theory = EXAMS.find((exam) => exam.id === 'exam-theory');
  assert.ok(full && security && coding && theory);
  assert.equal(full.items.length, allQuestions().length + allTheoryQuestions().length);
  assert.ok(full.items.some((item) => item.mode === 'code'));
  assert.ok(full.items.some((item) => item.mode === 'theory'));
  assert.ok(full.items.some((item) => item.topicId === 'acl'));
  assert.ok(security.items.every((item) => item.topicId === 'acl'));
  assert.ok(security.items.some((item) => item.mode === 'code'));
  assert.ok(security.items.some((item) => item.mode === 'theory'));
  assert.ok(coding.items.every((item) => item.mode === 'code'));
  assert.equal(coding.items.length, allQuestions().length);
  assert.ok(theory.items.every((item) => item.mode === 'theory'));
  for (const exam of EXAMS) {
    assert.ok(exam.items.length > 0, exam.id);
    for (const item of exam.items) {
      const question = getQuestion(item.topicId, item.questionId, item.mode);
      assert.equal(question.id, item.questionId, `${exam.id} missing ${item.questionId}`);
    }
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
