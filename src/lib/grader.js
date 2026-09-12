const COMMENT_BLOCK = /\/\*[\s\S]*?\*\//g;
const COMMENT_LINE = /(^|[^:\\])\/\/.*$/gm;

export function stripComments(code) {
  return String(code ?? '')
    .replace(COMMENT_BLOCK, ' ')
    .replace(COMMENT_LINE, '$1');
}

export function normalize(code) {
  return stripComments(code).replace(/\s+/g, ' ').trim();
}

function asRegex(value, flags = '') {
  if (value instanceof RegExp) {
    return value;
  }
  return new RegExp(value, flags);
}

function runCheck(source, stripped, check) {
  const haystack = check.raw ? source : stripped;
  const type = check.type || 'includes';

  if (type === 'includes') {
    const ok = haystack.includes(check.value);
    return { ok, message: check.message, detail: ok ? 'found' : `missing “${check.value}”` };
  }

  if (type === 'includesi') {
    const ok = haystack.toLowerCase().includes(String(check.value).toLowerCase());
    return { ok, message: check.message, detail: ok ? 'found' : `missing “${check.value}”` };
  }

  if (type === 'excludes') {
    const ok = !haystack.includes(check.value);
    return { ok, message: check.message, detail: ok ? 'ok' : `must not include “${check.value}”` };
  }

  if (type === 'regex') {
    const ok = asRegex(check.value, check.flags || '').test(haystack);
    return { ok, message: check.message, detail: ok ? 'matched' : 'pattern not found' };
  }

  if (type === 'oneOf') {
    const ok = (check.values || []).some((value) => haystack.includes(value));
    return {
      ok,
      message: check.message,
      detail: ok ? 'found' : `need one of: ${(check.values || []).join(', ')}`,
    };
  }

  if (type === 'allOf') {
    const missing = (check.values || []).filter((value) => !haystack.includes(value));
    return {
      ok: missing.length === 0,
      message: check.message,
      detail: missing.length ? `missing ${missing.join(', ')}` : 'found',
    };
  }

  if (type === 'order') {
    const values = check.values || [];
    let from = 0;
    for (const value of values) {
      const idx = haystack.indexOf(value, from);
      if (idx === -1) {
        return { ok: false, message: check.message, detail: `missing “${value}” in order` };
      }
      from = idx + value.length;
    }
    return { ok: true, message: check.message, detail: 'order ok' };
  }

  if (type === 'minCount') {
    const needle = check.value;
    let count = 0;
    let idx = 0;
    while (needle && (idx = haystack.indexOf(needle, idx)) !== -1) {
      count += 1;
      idx += needle.length;
    }
    const ok = count >= (check.count || 1);
    return {
      ok,
      message: check.message,
      detail: ok ? `${count} occurrence(s)` : `need at least ${check.count} of “${needle}”`,
    };
  }

  return { ok: false, message: check.message || 'Unknown check', detail: type };
}

export function grade(code, checks = []) {
  const started = performance.now();
  const source = String(code ?? '');
  const stripped = stripComments(source);
  const results = (checks || []).map((check) => runCheck(source, stripped, check));
  return {
    passed: results.length > 0 && results.every((item) => item.ok),
    results,
    durationMs: Math.max(0, performance.now() - started),
  };
}

export function includes(value, message) {
  return { type: 'includes', value, message };
}

export function includesi(value, message) {
  return { type: 'includesi', value, message };
}

export function excludes(value, message) {
  return { type: 'excludes', value, message };
}

export function regex(value, message, flags) {
  return { type: 'regex', value, message, flags };
}

export function oneOf(values, message) {
  return { type: 'oneOf', values, message };
}

export function allOf(values, message) {
  return { type: 'allOf', values, message };
}

export function order(values, message) {
  return { type: 'order', values, message };
}

export function minCount(value, count, message) {
  return { type: 'minCount', value, count, message };
}

export function normalizeTheoryAnswer(answer) {
  return (Array.isArray(answer) ? answer : [answer])
    .filter((item) => item !== undefined && item !== null && item !== '')
    .map(String)
    .sort();
}

export function gradeTheory(selected, question) {
  const started = performance.now();
  const expected = normalizeTheoryAnswer(question?.answer);
  const got = normalizeTheoryAnswer(selected);
  const passed = expected.length > 0 && got.length === expected.length && got.every((value, index) => value === expected[index]);
  return {
    passed,
    results: [
      {
        ok: passed,
        message: passed ? 'Correct' : 'Incorrect',
        detail: passed ? 'matched' : 'Choose an answer, then Grade',
      },
    ],
    durationMs: Math.max(0, performance.now() - started),
  };
}
