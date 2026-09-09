import { TOPICS, getTopic } from '/lib/questions/index.js';
import { grade } from '/lib/grader.js';
import { createEditor } from '/js/editor.js';

const STORAGE_KEY = 'snow-itsm-lab-v1';

const state = {
  topicId: TOPICS[0].id,
  questionId: TOPICS[0].questions[0].id,
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

function currentQuestion() {
  const topic = currentTopic();
  return topic.questions.find((item) => item.id === state.questionId) || topic.questions[0];
}

function questionKey(question = currentQuestion()) {
  return question.id;
}

function passedCount(topic) {
  return topic.questions.filter((item) => state.progress.results[item.id]?.passed).length;
}

function renderSidebar() {
  const nav = document.getElementById('topic-nav');
  nav.innerHTML = TOPICS.map((topic) => {
    const done = passedCount(topic);
    const active = topic.id === state.topicId ? 'active' : '';
    return `<button class="topic ${active}" data-topic="${topic.id}">
      <span class="topic-title">${topic.title}</span>
      <span class="topic-count">${done}/${topic.questions.length}</span>
    </button>`;
  }).join('');

  nav.querySelectorAll('.topic').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.topicId = btn.dataset.topic;
      state.questionId = getTopic(state.topicId).questions[0].id;
      state.solutionOpen = false;
      render();
    });
  });
}

function renderQuestionList() {
  const topic = currentTopic();
  const list = document.getElementById('question-list');
  list.innerHTML = topic.questions
    .map((item, index) => {
      const result = state.progress.results[item.id];
      const cls = [
        item.id === state.questionId ? 'active' : '',
        result?.passed ? 'passed' : '',
        result?.revealed && !result?.passed ? 'revealed' : '',
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
      persistCode();
      state.questionId = btn.dataset.qid;
      state.solutionOpen = false;
      render();
    });
  });
}

function persistCode() {
  if (!state.editor) {
    return;
  }
  state.progress.answers[questionKey()] = state.editor.getValue();
  saveProgress();
}

function renderPrompt() {
  const question = currentQuestion();
  const topic = currentTopic();
  document.getElementById('crumb').textContent = `${topic.title} · ${question.kind.replaceAll('_', ' ')}`;
  document.getElementById('q-title').textContent = question.title;
  document.getElementById('q-prompt').textContent = question.prompt;
  document.getElementById('hint').textContent = question.hint || '';
  document.getElementById('hint').hidden = !question.hint;
  document.getElementById('solution-pane').hidden = !state.solutionOpen;
  document.getElementById('solution-code').textContent = question.solution;
  document.getElementById('reveal-btn').textContent = state.solutionOpen ? 'Hide solution' : 'Show solution';
}

function renderGrade(result) {
  const box = document.getElementById('grade-results');
  if (!result) {
    box.innerHTML = '<p class="muted">Press Grade (Ctrl/Cmd+Enter) for instant feedback.</p>';
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
  renderQuestionList();
  renderPrompt();
  const question = currentQuestion();
  const stored = codeForQuestion(question);
  if (state.editor) {
    state.editor.setValue(stored);
  }
  const last = state.progress.results[question.id];
  renderGrade(last?.grade || null);
  document.getElementById('blurb').textContent = currentTopic().blurb;
  document.getElementById('progress-label').textContent = `${passedCount(currentTopic())} of ${currentTopic().questions.length} passed in this topic`;
}

function runGrade() {
  persistCode();
  const question = currentQuestion();
  const code = state.editor ? state.editor.getValue() : codeForQuestion(question);
  const result = grade(code, question.checks);
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
  state.editor?.setValue(question.solution);
  persistCode();
}

function resetCode() {
  const question = currentQuestion();
  delete state.progress.answers[question.id];
  state.editor?.setValue(question.starter);
  saveProgress();
}

function bind() {
  document.getElementById('grade-btn').addEventListener('click', runGrade);
  document.getElementById('reveal-btn').addEventListener('click', revealSolution);
  document.getElementById('apply-btn').addEventListener('click', applySolution);
  document.getElementById('reset-btn').addEventListener('click', resetCode);
}

async function main() {
  bind();
  const host = document.getElementById('editor');
  const question = currentQuestion();
  try {
    state.editor = await createEditor(host, codeForQuestion(question), () => persistCode());
  } catch (error) {
    host.innerHTML = `<textarea id="fallback" class="fallback">${codeForQuestion(question)}</textarea>`;
    const area = document.getElementById('fallback');
    area.addEventListener('input', () => {
      state.progress.answers[questionKey()] = area.value;
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
