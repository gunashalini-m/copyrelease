const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

export function mcq(id, title, prompt, choices, correctIndex, explanation, difficulty = 'intermediate') {
  const options = choices.map((text, index) => ({
    id: LETTERS[index],
    text,
  }));
  const answer = Array.isArray(correctIndex)
    ? correctIndex.map((index) => LETTERS[index])
    : LETTERS[correctIndex];
  return {
    id,
    title,
    difficulty,
    format: 'theory',
    kind: 'theory',
    prompt,
    options,
    answer,
    explanation,
    multi: Array.isArray(correctIndex),
  };
}

export function question({
  id,
  title,
  difficulty = 'intermediate',
  kind = 'server',
  prompt,
  starter = '',
  solution,
  checks,
  hint,
}) {
  return { id, title, difficulty, kind, prompt, starter, solution, checks, hint };
}

export const STARTERS = {
  script: '// Write your ServiceNow script below\n',
  businessRule: `(function executeRule(current, previous /*null when async*/) {

})(current, previous);
`,
  client: `function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || newValue === '') {
    return;
  }

}
`,
  clientLoad: `function onLoad() {

}
`,
  clientSubmit: `function onSubmit() {
  return true;
}
`,
  scriptInclude: `var MyScriptInclude = Class.create();
MyScriptInclude.prototype = {
  initialize: function() {
  },

  type: 'MyScriptInclude'
};
`,
  glideAjax: `var MyAjax = Class.create();
MyAjax.prototype = Object.extend(new AbstractAjaxProcessor(), {
  type: 'MyAjax'
});
`,
  scriptedRest: `(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {

})(request, response);
`,
};
