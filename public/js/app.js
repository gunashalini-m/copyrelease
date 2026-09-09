import { TOPICS, getTopic, activeQuestions } from '/lib/questions/index.js';
import { grade, gradeTheory } from '/lib/grader.js';
import { createEditor } from '/js/editor.js';

const STORAGE_KEY = 'snow-itsm-lab-v2';

const state = {
  topicId: TOPICS[0].id,
  questionId: TOPICS[0].questions[0].id,
  mode: 'code',
  editor: null,
  progress: loadProgress(),
  solutionOpen: false,
};

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"answers":{},"results":{}}');
  } catch {
    return { answers: {}, results: {} };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function currentTopic() {
  return getTopic(state.topicId);
}

function currentList() {
  return activeQuestions(currentTopic(), state.mode);
}

function currentQuestion() {
  const list = currentList();
  return list.find((item) => item.id === state.questionId) || list[0];
}

function passedCount(topic, mode) {
  return activeQuestions(topic, mode).filter((item) => state.progress.results[item.id]?.passed).length;
}

function persistCode() {
  if (state.mode !== 'code' || !state.editor) {
    return;
  }
  state.progress.answers[currentQuestion().id] = state.editor.getValue();
  saveProgress();
}

function persistTheory() {
  const question = currentQuestion();
  if (question.multi) {
    const selected = [...document.querySelectorAll('#theory-box input:checked')].map((el) => el.value);
    state.progress.answers[question.id] = selected;
  } else {
    const selected = document.querySelector('#theory-box input:checked');
    state.progress.answers[question.id] = selected ? selected.value : '';
  }
  saveProgress();
}

function renderSidebar() {
  const nav = document.getElementById('topic-nav');
  nav.innerHTML = TOPICS.map((topic) => {
    const codeDone = passedCount(topic, 'code');
    const theoryDone = passedCount(topic, 'theory');
    const active = topic.id === state.topicId ? 'active' : '';
    return `<button class="topic ${active}" data-topic="${topic.id}">
      <span class="topic-title">${topic.title}</span>
      <span class="topic-count">${codeDone}/15 · ${theoryDone}/15</span>
    </button>`;
  }).join('');

  nav.querySelectorAll('.topic').forEach((btn) => {
    btn.addEventListener('click', () => {
      persistCurrent();
      state.topicId = btn.dataset.topic;
      state.questionId = activeQuestions(getTopic(state.topicId), state.mode)[0].id;
      state.solutionOpen = false;
      render();
    });
  });
}

function persistCurrent() {
  if (state.mode === 'code') persistCode();
  else persistTheory();
}

function renderModeToggle() {
  document.querySelectorAll('#mode-toggle [data-mode]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === state.mode);
  });
}

function renderQuestionList() {
  const list = document.getElementById('question-list');
  list.innerHTML = currentList()
    .map((item, index) => {
      const result = state.progress.results[item.id];
      const cls = [
        item.id === state.questionId ? 'active' : '',
        result?.passed ? 'passed' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `<button class="q-item ${cls}" data-qid="${item.id}">
        <span class="q-idx">${String(index + 1).padStart(2, '0')}</span>
        <span class="q-name">${item.title}</span>
        <span class="q-diff">${item.difficulty}</span>
      </button>`;
    })
    .join('');

  list.querySelectorAll('.q-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      persistCurrent();
      state.questionId = btn.dataset.qid;
      state.solutionOpen = false;
      render();
    });
  });
}

function theorySolutionText(question) {
  const ids = Array.isArray(question.answer) ? question.answer : [question.answer];
  const labels = ids.map((id) => {
    const option = question.options.find((item) => item.id === id);
    return option ? `${id.toUpperCase()}. ${option.text}` : id;
  });
  return `${labels.join('\n')}\n\n${question.explanation || ''}`;
}

function renderPrompt() {
  const question = currentQuestion();
  const topic = currentTopic();
  const isTheory = state.mode === 'theory';
  document.getElementById('crumb').textContent = `${topic.title} · ${isTheory ? 'theory' : question.kind.replaceAll('_', ' ')}`;
  document.getElementById('q-title').textContent = question.title;
  document.getElementById('q-prompt').textContent = question.prompt;
  document.getElementById('hint').textContent = question.hint || '';
  document.getElementById('hint').hidden = !question.hint;
  document.getElementById('solution-pane').hidden = !state.solutionOpen;
  document.getElementById('solution-code').textContent = isTheory ? theorySolutionText(question) : question.solution;
  document.getElementById('reveal-btn').textContent = state.solutionOpen ? 'Hide solution' : 'Show solution';
  document.getElementById('apply-btn').textContent = isTheory ? 'Select correct answer' : 'Copy solution into editor';
  document.getElementById('editor').hidden = isTheory;
  document.getElementById('theory-box').hidden = !isTheory;
}

function renderTheory() {
  const question = currentQuestion();
  const box = document.getElementById('theory-box');
  if (state.mode !== 'theory') {
    box.innerHTML = '';
    return;
  }
  const saved = state.progress.answers[question.id];
  const selected = new Set(Array.isArray(saved) ? saved : saved ? [saved] : []);
  const inputType = question.multi ? 'checkbox' : 'radio';
  box.innerHTML = question.options
    .map(
      (option) => `<label class="theory-option ${selected.has(option.id) ? 'selected' : ''}">
        <input type="${inputType}" name="theory-${question.id}" value="${option.id}" ${selected.has(option.id) ? 'checked' : ''} />
        <span><strong>${option.id.toUpperCase()}.</strong> ${option.text}</span>
      </label>`,
    )
    .join('');
  box.querySelectorAll('input').forEach((input) => {
    input.addEventListener('change', () => {
      persistTheory();
      renderTheory();
    });
  });
}

function renderGrade(result) {
  const box = document.getElementById('grade-results');
  if (!result) {
    box.innerHTML = `<p class="muted">${state.mode === 'theory' ? 'Pick an answer, then Grade.' : 'Press Grade (Ctrl/Cmd+Enter) for instant feedback.'}</p>`;
    box.className = 'grade-box';
    return;
  }
  box.className = `grade-box ${result.passed ? 'ok' : 'fail'}`;
  const rows = result.results
    .map(
      (item) =>
        `<li class="${item.ok ? 'ok' : 'fail'}"><span>${item.ok ? 'Pass' : 'Fail'}</span>${escapeHtml(item.message)}${item.ok ? '' : ` — ${escapeHtml(item.detail)}`}</li>`,
    )
    .join('');
  box.innerHTML = `<div class="grade-head">${result.passed ? 'Passed' : 'Not yet'} · ${result.durationMs.toFixed(1)} ms</div><ul>${rows}</ul>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function codeForQuestion(question) {
  return state.progress.answers[question.id] ?? question.starter;
}

async function render() {
  renderSidebar();
  renderModeToggle();
  renderQuestionList();
  renderPrompt();
  renderTheory();
  const question = currentQuestion();
  if (state.mode === 'code' && state.editor) {
    state.editor.setValue(codeForQuestion(question));
  }
  const last = state.progress.results[question.id];
  renderGrade(last?.grade || null);
  document.getElementById('blurb').textContent = currentTopic().blurb;
  const topic = currentTopic();
  document.getElementById('progress-label').textContent =
    state.mode === 'theory'
      ? `${passedCount(topic, 'theory')} of 15 theory passed`
      : `${passedCount(topic, 'code')} of 15 code passed`;
}

function runGrade() {
  persistCurrent();
  const question = currentQuestion();
  let result;
  if (state.mode === 'theory') {
    result = gradeTheory(state.progress.answers[question.id], question);
  } else {
    const code = state.editor ? state.editor.getValue() : codeForQuestion(question);
    result = grade(code, question.checks);
  }
  const prev = state.progress.results[question.id] || {};
  state.progress.results[question.id] = {
    ...prev,
    passed: result.passed,
    grade: result,
  };
  saveProgress();
  renderSidebar();
  renderQuestionList();
  renderGrade(result);
}

function revealSolution() {
  state.solutionOpen = !state.solutionOpen;
  const question = currentQuestion();
  const prev = state.progress.results[question.id] || {};
  state.progress.results[question.id] = { ...prev, revealed: true };
  saveProgress();
  renderPrompt();
}

function applySolution() {
  const question = currentQuestion();
  if (state.mode === 'theory') {
    state.progress.answers[question.id] = question.multi ? question.answer : question.answer;
    saveProgress();
    renderTheory();
    return;
  }
  state.editor?.setValue(question.solution);
  persistCode();
}

function resetCode() {
  const question = currentQuestion();
  delete state.progress.answers[question.id];
  saveProgress();
  if (state.mode === 'code') {
    state.editor?.setValue(question.starter);
  } else {
    renderTheory();
  }
}

function bind() {
  document.getElementById('grade-btn').addEventListener('click', runGrade);
  document.getElementById('reveal-btn').addEventListener('click', revealSolution);
  document.getElementById('apply-btn').addEventListener('click', applySolution);
  document.getElementById('reset-btn').addEventListener('click', resetCode);
  document.querySelectorAll('#mode-toggle [data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      persistCurrent();
      state.mode = btn.dataset.mode;
      state.questionId = currentList()[0].id;
      state.solutionOpen = false;
      render();
    });
  });
}

async function main() {
  bind();
  const host = document.getElementById('editor');
  const question = currentQuestion();
  try {
    state.editor = await createEditor(host, codeForQuestion(question), () => persistCode());
  } catch (error) {
    host.innerHTML = `<textarea id="fallback" class="fallback"></textarea>`;
    const area = document.getElementById('fallback');
    area.value = codeForQuestion(question);
    area.addEventListener('input', () => {
      state.progress.answers[currentQuestion().id] = area.value;
      saveProgress();
    });
    state.editor = {
      getValue: () => area.value,
      setValue: (value) => {
        area.value = value;
      },
    };
    console.error(error);
  }
  await render();
}

main();
