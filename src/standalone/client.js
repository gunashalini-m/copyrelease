/* global TOPICS, SNOW_API */
(function () {
  const STORAGE_KEY = 'snow-itsm-lab-v1';

  const COMMENT_BLOCK = /\/\*[\s\S]*?\*\//g;
  const COMMENT_LINE = /(^|[^:\\])\/\/.*$/gm;

  function stripComments(code) {
    return String(code ?? '')
      .replace(COMMENT_BLOCK, ' ')
      .replace(COMMENT_LINE, '$1');
  }

  function asRegex(value, flags) {
    if (value instanceof RegExp) return value;
    return new RegExp(value, flags || '');
  }

  function runCheck(source, stripped, check) {
    const haystack = check.raw ? source : stripped;
    const type = check.type || 'includes';
    if (type === 'includes') {
      const ok = haystack.includes(check.value);
      return { ok, message: check.message, detail: ok ? 'found' : 'missing “' + check.value + '”' };
    }
    if (type === 'includesi') {
      const ok = haystack.toLowerCase().includes(String(check.value).toLowerCase());
      return { ok, message: check.message, detail: ok ? 'found' : 'missing “' + check.value + '”' };
    }
    if (type === 'excludes') {
      const ok = !haystack.includes(check.value);
      return { ok, message: check.message, detail: ok ? 'ok' : 'must not include “' + check.value + '”' };
    }
    if (type === 'regex') {
      const pattern = check.value && check.value.__regex
        ? new RegExp(check.value.source, check.value.flags || '')
        : asRegex(check.value, check.flags);
      const ok = pattern.test(haystack);
      return { ok, message: check.message, detail: ok ? 'matched' : 'pattern not found' };
    }
    if (type === 'oneOf') {
      const ok = (check.values || []).some(function (value) { return haystack.includes(value); });
      return { ok, message: check.message, detail: ok ? 'found' : 'need one of: ' + (check.values || []).join(', ') };
    }
    if (type === 'allOf') {
      const missing = (check.values || []).filter(function (value) { return !haystack.includes(value); });
      return { ok: missing.length === 0, message: check.message, detail: missing.length ? 'missing ' + missing.join(', ') : 'found' };
    }
    if (type === 'order') {
      const values = check.values || [];
      var from = 0;
      for (var i = 0; i < values.length; i += 1) {
        var idx = haystack.indexOf(values[i], from);
        if (idx === -1) return { ok: false, message: check.message, detail: 'missing “' + values[i] + '” in order' };
        from = idx + values[i].length;
      }
      return { ok: true, message: check.message, detail: 'order ok' };
    }
    if (type === 'minCount') {
      var needle = check.value;
      var count = 0;
      var pos = 0;
      while (needle && (pos = haystack.indexOf(needle, pos)) !== -1) {
        count += 1;
        pos += needle.length;
      }
      var okc = count >= (check.count || 1);
      return { ok: okc, message: check.message, detail: okc ? count + ' occurrence(s)' : 'need at least ' + check.count + ' of “' + needle + '”' };
    }
    return { ok: false, message: check.message || 'Unknown check', detail: type };
  }

  function grade(code, checks) {
    var started = performance.now();
    var source = String(code ?? '');
    var stripped = stripComments(source);
    var results = (checks || []).map(function (check) { return runCheck(source, stripped, check); });
    return {
      passed: results.length > 0 && results.every(function (item) { return item.ok; }),
      results: results,
      durationMs: Math.max(0, performance.now() - started),
    };
  }

  function hydrateChecks(checks) {
    return (checks || []).map(function (check) {
      if (check && check.value && check.value.__regex) {
        return Object.assign({}, check, { value: new RegExp(check.value.source, check.value.flags || '') });
      }
      return check;
    });
  }

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"answers":{},"results":{}}');
    } catch (e) {
      return { answers: {}, results: {} };
    }
  }

  function saveProgress(progress) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getTopic(id) {
    return TOPICS.find(function (topic) { return topic.id === id; }) || TOPICS[0];
  }

  var state = {
    topicId: TOPICS[0].id,
    questionId: TOPICS[0].questions[0].id,
    progress: loadProgress(),
    solutionOpen: false,
    acIndex: 0,
    acItems: [],
  };

  function currentTopic() {
    return getTopic(state.topicId);
  }

  function currentQuestion() {
    var topic = currentTopic();
    return topic.questions.find(function (item) { return item.id === state.questionId; }) || topic.questions[0];
  }

  function passedCount(topic) {
    return topic.questions.filter(function (item) { return state.progress.results[item.id] && state.progress.results[item.id].passed; }).length;
  }

  var textarea = document.getElementById('code');
  var acMenu = document.getElementById('ac-menu');

  function persistCode() {
    state.progress.answers[currentQuestion().id] = textarea.value;
    saveProgress(state.progress);
  }

  function snippetInsert(text) {
    return String(text || '').replace(/\$\{\d+:([^}]+)\}/g, '$1').replace(/\$\d+/g, '');
  }

  function completionsFor(prefix, objectName) {
    var items = [];
    var p = (prefix || '').toLowerCase();
    if (objectName && SNOW_API.namespaces[objectName]) {
      (SNOW_API.namespaces[objectName].methods || []).forEach(function (method) {
        if (!p || method.name.toLowerCase().indexOf(p) === 0) {
          items.push({ label: method.name, detail: method.signature, insert: snippetInsert(method.insertText || method.name + '()') });
        }
      });
    }
    if (objectName && SNOW_API.classes[objectName] && SNOW_API.classes[objectName].methods) {
      SNOW_API.classes[objectName].methods.forEach(function (method) {
        if (!p || method.name.toLowerCase().indexOf(p) === 0) {
          items.push({ label: method.name, detail: method.signature, insert: snippetInsert(method.insertText || method.name + '()') });
        }
      });
    }
    if (items.length) return items.slice(0, 20);
    Object.keys(SNOW_API.classes).forEach(function (name) {
      if (!p || name.toLowerCase().indexOf(p) === 0) {
        var cls = SNOW_API.classes[name];
        items.push({ label: name, detail: cls.detail, insert: snippetInsert(cls.construct || name) });
      }
    });
    SNOW_API.globals.forEach(function (g) {
      if (!p || g.name.toLowerCase().indexOf(p) === 0) {
        items.push({ label: g.name, detail: g.detail, insert: g.name });
      }
    });
    SNOW_API.snippets.forEach(function (snip) {
      if (!p || snip.label.toLowerCase().indexOf(p) !== -1) {
        items.push({ label: snip.label, detail: 'snippet', insert: snippetInsert(snip.insertText) });
      }
    });
    SNOW_API.tables.forEach(function (table) {
      if (p && table.toLowerCase().indexOf(p) === 0) {
        items.push({ label: table, detail: 'table', insert: table });
      }
    });
    return items.slice(0, 20);
  }

  function tokenBeforeCursor() {
    var pos = textarea.selectionStart;
    var before = textarea.value.slice(0, pos);
    var member = before.match(/([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)$/);
    if (member) return { objectName: member[1], prefix: member[2], start: pos - member[2].length };
    var word = before.match(/[A-Za-z_$][\w$]*$/);
    if (word) return { objectName: '', prefix: word[0], start: pos - word[0].length };
    return { objectName: '', prefix: '', start: pos };
  }

  function hideAc() {
    acMenu.hidden = true;
    state.acItems = [];
  }

  function showAc() {
    var token = tokenBeforeCursor();
    if (!token.prefix && !token.objectName) {
      hideAc();
      return;
    }
    state.acItems = completionsFor(token.prefix, token.objectName);
    state.acIndex = 0;
    if (!state.acItems.length) {
      hideAc();
      return;
    }
    acMenu.innerHTML = state.acItems.map(function (item, i) {
      return '<button type="button" class="ac-item' + (i === 0 ? ' active' : '') + '" data-i="' + i + '"><strong>' + escapeHtml(item.label) + '</strong><span>' + escapeHtml(item.detail || '') + '</span></button>';
    }).join('');
    acMenu.hidden = false;
    acMenu.querySelectorAll('.ac-item').forEach(function (btn) {
      btn.addEventListener('mousedown', function (ev) {
        ev.preventDefault();
        acceptAc(Number(btn.getAttribute('data-i')));
      });
    });
  }

  function acceptAc(index) {
    var item = state.acItems[index];
    if (!item) return;
    var token = tokenBeforeCursor();
    var value = textarea.value;
    var pos = textarea.selectionStart;
    textarea.value = value.slice(0, token.start) + item.insert + value.slice(pos);
    var caret = token.start + item.insert.length;
    textarea.selectionStart = textarea.selectionEnd = caret;
    hideAc();
    persistCode();
    textarea.focus();
  }

  function renderSidebar() {
    var nav = document.getElementById('topic-nav');
    nav.innerHTML = TOPICS.map(function (topic) {
      var done = passedCount(topic);
      var active = topic.id === state.topicId ? 'active' : '';
      return '<button class="topic ' + active + '" data-topic="' + topic.id + '"><span class="topic-title">' + escapeHtml(topic.title) + '</span><span class="topic-count">' + done + '/' + topic.questions.length + '</span></button>';
    }).join('');
    nav.querySelectorAll('.topic').forEach(function (btn) {
      btn.addEventListener('click', function () {
        persistCode();
        state.topicId = btn.getAttribute('data-topic');
        state.questionId = getTopic(state.topicId).questions[0].id;
        state.solutionOpen = false;
        render();
      });
    });
  }

  function renderQuestionList() {
    var topic = currentTopic();
    var list = document.getElementById('question-list');
    list.innerHTML = topic.questions.map(function (item, index) {
      var result = state.progress.results[item.id];
      var cls = item.id === state.questionId ? 'active' : '';
      if (result && result.passed) cls += ' passed';
      return '<button class="q-item ' + cls + '" data-qid="' + item.id + '"><span class="q-idx">' + String(index + 1).padStart(2, '0') + '</span><span class="q-name">' + escapeHtml(item.title) + '</span><span class="q-diff">' + escapeHtml(item.difficulty) + '</span></button>';
    }).join('');
    list.querySelectorAll('.q-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        persistCode();
        state.questionId = btn.getAttribute('data-qid');
        state.solutionOpen = false;
        render();
      });
    });
  }

  function renderGrade(result) {
    var box = document.getElementById('grade-results');
    if (!result) {
      box.innerHTML = '<p class="muted">Press Grade (Ctrl/Cmd+Enter) for instant feedback. Type a ServiceNow API name for autocomplete.</p>';
      box.className = 'grade-box';
      return;
    }
    box.className = 'grade-box ' + (result.passed ? 'ok' : 'fail');
    var rows = result.results.map(function (item) {
      return '<li class="' + (item.ok ? 'ok' : 'fail') + '"><span>' + (item.ok ? 'Pass' : 'Fail') + '</span>' + escapeHtml(item.message) + (item.ok ? '' : ' — ' + escapeHtml(item.detail)) + '</li>';
    }).join('');
    box.innerHTML = '<div class="grade-head">' + (result.passed ? 'Passed' : 'Not yet') + ' · ' + result.durationMs.toFixed(1) + ' ms</div><ul>' + rows + '</ul>';
  }

  function render() {
    var question = currentQuestion();
    var topic = currentTopic();
    renderSidebar();
    renderQuestionList();
    document.getElementById('crumb').textContent = topic.title + ' · ' + String(question.kind || 'server').replace(/_/g, ' ');
    document.getElementById('q-title').textContent = question.title;
    document.getElementById('q-prompt').textContent = question.prompt;
    var hint = document.getElementById('hint');
    hint.textContent = question.hint || '';
    hint.hidden = !question.hint;
    document.getElementById('solution-pane').hidden = !state.solutionOpen;
    document.getElementById('solution-code').textContent = question.solution;
    document.getElementById('reveal-btn').textContent = state.solutionOpen ? 'Hide solution' : 'Show solution';
    textarea.value = state.progress.answers[question.id] != null ? state.progress.answers[question.id] : question.starter;
    var last = state.progress.results[question.id];
    renderGrade(last && last.grade ? last.grade : null);
    document.getElementById('blurb').textContent = topic.blurb;
    document.getElementById('progress-label').textContent = passedCount(topic) + ' of ' + topic.questions.length + ' passed in this topic';
  }

  function runGrade() {
    persistCode();
    var question = currentQuestion();
    var result = grade(textarea.value, hydrateChecks(question.checks));
    var prev = state.progress.results[question.id] || {};
    state.progress.results[question.id] = { passed: result.passed, grade: result, revealed: prev.revealed };
    saveProgress(state.progress);
    renderSidebar();
    renderQuestionList();
    renderGrade(result);
  }

  document.getElementById('grade-btn').addEventListener('click', runGrade);
  document.getElementById('reveal-btn').addEventListener('click', function () {
    state.solutionOpen = !state.solutionOpen;
    var prev = state.progress.results[currentQuestion().id] || {};
    state.progress.results[currentQuestion().id] = Object.assign({}, prev, { revealed: true });
    saveProgress(state.progress);
    render();
  });
  document.getElementById('apply-btn').addEventListener('click', function () {
    textarea.value = currentQuestion().solution;
    persistCode();
  });
  document.getElementById('reset-btn').addEventListener('click', function () {
    delete state.progress.answers[currentQuestion().id];
    saveProgress(state.progress);
    textarea.value = currentQuestion().starter;
  });

  textarea.addEventListener('input', function () {
    persistCode();
    showAc();
  });
  textarea.addEventListener('keydown', function (ev) {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
      ev.preventDefault();
      hideAc();
      runGrade();
      return;
    }
    if (acMenu.hidden) return;
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      state.acIndex = (state.acIndex + 1) % state.acItems.length;
      acMenu.querySelectorAll('.ac-item').forEach(function (el, i) { el.classList.toggle('active', i === state.acIndex); });
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      state.acIndex = (state.acIndex - 1 + state.acItems.length) % state.acItems.length;
      acMenu.querySelectorAll('.ac-item').forEach(function (el, i) { el.classList.toggle('active', i === state.acIndex); });
    } else if (ev.key === 'Tab' || ev.key === 'Enter') {
      ev.preventDefault();
      acceptAc(state.acIndex);
    } else if (ev.key === 'Escape') {
      hideAc();
    }
  });
  textarea.addEventListener('blur', function () {
    setTimeout(hideAc, 150);
  });

  render();
})();
