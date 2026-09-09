import { question, STARTERS } from './helpers.js';
import { includes, oneOf } from '../grader.js';

export const TOPIC = {
  id: 'knowledge',
  title: 'Knowledge Management',
  blurb: 'Author, publish, retire, and search knowledge articles used by ITSM.',
};

export const questions = [
  question({
    id: 'kb-01',
    title: 'Query published articles in a KB',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Query kb_knowledge where workflow_state is published and kb_knowledge_base name is "IT". Use addQuery with a join or encoded query kb_knowledge_base.name=IT. Log number and short_description.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('kb_knowledge');
gr.addQuery('workflow_state', 'published');
gr.addQuery('kb_knowledge_base.name', 'IT');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('number') + ' ' + gr.getValue('short_description'));
}`,
    checks: [
      includes("new GlideRecord('kb_knowledge')", 'kb_knowledge'),
      includes("addQuery('workflow_state', 'published')", 'Published'),
      includes('kb_knowledge_base', 'Knowledge base'),
      includes('IT', 'IT knowledge base'),
    ],
  }),
  question({
    id: 'kb-02',
    title: 'Create a draft article',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Insert kb_knowledge with short_description "Reset VPN client", text "Reinstall the VPN profile.", workflow_state draft, and kb_knowledge_base looked up by title/name "IT". Use get on kb_knowledge_base table (name field).',
    starter: STARTERS.script,
    solution: `var kb = new GlideRecord('kb_knowledge_base');
kb.get('name', 'IT');
var art = new GlideRecord('kb_knowledge');
art.initialize();
art.setValue('short_description', 'Reset VPN client');
art.setValue('text', 'Reinstall the VPN profile.');
art.setValue('workflow_state', 'draft');
art.setValue('kb_knowledge_base', kb.getUniqueValue());
art.insert();`,
    checks: [
      includes("new GlideRecord('kb_knowledge')", 'Create article'),
      includes('Reset VPN client', 'Title'),
      includes('draft', 'Draft state'),
      includes('kb_knowledge_base', 'Set KB'),
    ],
  }),
  question({
    id: 'kb-03',
    title: 'Retire expired articles',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Query kb_knowledge where valid_to is before gs.nowDateTime() and workflow_state is published. Set workflow_state to retired and update each with setWorkflow(false).',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('kb_knowledge');
gr.addQuery('workflow_state', 'published');
gr.addQuery('valid_to', '<', gs.nowDateTime());
gr.query();
while (gr.next()) {
  gr.setValue('workflow_state', 'retired');
  gr.setWorkflow(false);
  gr.update();
}`,
    checks: [
      includes("new GlideRecord('kb_knowledge')", 'Articles'),
      includes('valid_to', 'Expiration'),
      includes('retired', 'Retire'),
      includes('setWorkflow(false)', 'Skip extra workflow'),
    ],
  }),
  question({
    id: 'kb-04',
    title: 'Increment helpful count',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Load article by sys_id kbId. Increment helpful_count by 1 (parseInt) and update.',
    starter: `var kbId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';\n`,
    solution: `var kbId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
var gr = new GlideRecord('kb_knowledge');
if (gr.get(kbId)) {
  var n = parseInt(gr.getValue('helpful_count') || '0', 10);
  gr.setValue('helpful_count', n + 1);
  gr.update();
}`,
    checks: [
      includes("new GlideRecord('kb_knowledge')", 'Load article'),
      includes('helpful_count', 'helpful_count'),
      includes('parseInt', 'parseInt'),
      includes('update()', 'Update'),
    ],
  }),
  question({
    id: 'kb-05',
    title: 'Abort publish without text',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'If workflow_state changes to published and text is empty, abort and add an error.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.workflow_state.changesTo('published') && current.text.nil()) {
    gs.addErrorMessage('Article body is required to publish.');
    current.setAbortAction(true);
  }
})(current, previous);`,
    checks: [
      includes("changesTo('published')", 'Publishing'),
      oneOf(['text.nil()', "getValue('text')"], 'Check text'),
      includes('setAbortAction(true)', 'Abort'),
    ],
  }),
  question({
    id: 'kb-06',
    title: 'Link article to incident',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Set incident incId field knowledge to kbId (or caused_by / knowledge depending on instance). Use setValue("knowledge", kbId) on incident and update.',
    starter: `var incId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
var kbId = 'cccccccccccccccccccccccccccccccc';
`,
    solution: `var incId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
var kbId = 'cccccccccccccccccccccccccccccccc';
var inc = new GlideRecord('incident');
if (inc.get(incId)) {
  inc.setValue('knowledge', kbId);
  inc.update();
}`,
    checks: [
      includes("new GlideRecord('incident')", 'Incident'),
      includes("setValue('knowledge'", 'Set knowledge'),
      includes('kbId', 'Use kbId'),
    ],
  }),
  question({
    id: 'kb-07',
    title: 'Record kb_feedback',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Insert kb_feedback for article kbId with used_count not needed: set article, user gs.getUserID(), and commented true, comments "Fixed my issue".',
    starter: `var kbId = 'dddddddddddddddddddddddddddddddd';\n`,
    solution: `var kbId = 'dddddddddddddddddddddddddddddddd';
var fb = new GlideRecord('kb_feedback');
fb.initialize();
fb.setValue('article', kbId);
fb.setValue('user', gs.getUserID());
fb.setValue('commented', true);
fb.setValue('comments', 'Fixed my issue');
fb.insert();`,
    checks: [
      includes("new GlideRecord('kb_feedback')", 'kb_feedback'),
      includes('article', 'Article'),
      includes('Fixed my issue', 'Comment'),
      includes('gs.getUserID()', 'Current user'),
    ],
  }),
  question({
    id: 'kb-08',
    title: 'Client: category mandatory on publish',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'onChange workflow_state: if newValue is published, setMandatory topic or kb_category. Use field kb_category.',
    starter: STARTERS.client,
    solution: `function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading) {
    return;
  }
  g_form.setMandatory('kb_category', newValue == 'published');
}`,
    checks: [
      includes("g_form.setMandatory('kb_category'", 'kb_category mandatory'),
      includes('published', 'When published'),
    ],
  }),
  question({
    id: 'kb-09',
    title: 'Search encoded query',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'addEncodedQuery workflow_state=published^short_descriptionLIKEVPN on kb_knowledge, orderByDesc sys_view_count, setLimit 5, log numbers.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('kb_knowledge');
gr.addEncodedQuery('workflow_state=published^short_descriptionLIKEVPN');
gr.orderByDesc('sys_view_count');
gr.setLimit(5);
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('number'));
}`,
    checks: [
      includes('addEncodedQuery', 'Encoded query'),
      includes('short_descriptionLIKEVPN', 'LIKE VPN'),
      includes("orderByDesc('sys_view_count')", 'Popular first'),
      includes('setLimit(5)', 'Limit 5'),
    ],
  }),
  question({
    id: 'kb-10',
    title: 'GlideAjax canReadArticle',
    difficulty: 'intermediate',
    kind: 'script_include',
    prompt: 'KBAjax.canRead: load kb_knowledge by sysparm_id, return "true" if canRead() else "false".',
    starter: STARTERS.glideAjax,
    solution: `var KBAjax = Class.create();
KBAjax.prototype = Object.extend(new AbstractAjaxProcessor(), {
  canRead: function() {
    var id = this.getParameter('sysparm_id');
    var gr = new GlideRecord('kb_knowledge');
    if (gr.get(id) && gr.canRead()) {
      return 'true';
    }
    return 'false';
  },
  type: 'KBAjax'
});`,
    checks: [
      includes('canRead', 'canRead'),
      includes("getParameter('sysparm_id')", 'sysparm_id'),
      includes("new GlideRecord('kb_knowledge')", 'Article'),
      includes('.canRead()', 'ACL canRead'),
    ],
  }),
  question({
    id: 'kb-11',
    title: 'Event kb.published',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'When workflow_state changes to published, queue kb.published with parm1 = number.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.workflow_state.changesTo('published')) {
    gs.eventQueue('kb.published', current, current.getValue('number'), '');
  }
})(current, previous);`,
    checks: [
      includes('gs.eventQueue', 'eventQueue'),
      includes('kb.published', 'Event'),
      includes("getValue('number')", 'Number parm'),
    ],
  }),
  question({
    id: 'kb-12',
    title: 'Copy article to a new draft',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Load kbId, insert a new kb_knowledge copying short_description and text, set workflow_state draft, short_description prefix "Copy of ".',
    starter: `var kbId = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';\n`,
    solution: `var kbId = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
var src = new GlideRecord('kb_knowledge');
if (src.get(kbId)) {
  var copy = new GlideRecord('kb_knowledge');
  copy.initialize();
  copy.setValue('short_description', 'Copy of ' + src.getValue('short_description'));
  copy.setValue('text', src.getValue('text'));
  copy.setValue('workflow_state', 'draft');
  copy.setValue('kb_knowledge_base', src.getValue('kb_knowledge_base'));
  copy.insert();
}`,
    checks: [
      includes('Copy of ', 'Prefix'),
      includes("setValue('text'", 'Copy text'),
      includes('draft', 'Draft'),
      includes('insert()', 'Insert copy'),
    ],
  }),
  question({
    id: 'kb-13',
    title: 'onLoad: read-only published body',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'If workflow_state is published, setReadOnly text to true.',
    starter: STARTERS.clientLoad,
    solution: `function onLoad() {
  if (g_form.getValue('workflow_state') == 'published') {
    g_form.setReadOnly('text', true);
  }
}`,
    checks: [
      includes("g_form.getValue('workflow_state')", 'Read state'),
      includes("g_form.setReadOnly('text', true)", 'Lock text'),
    ],
  }),
  question({
    id: 'kb-14',
    title: 'Count articles by author',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'GlideAggregate COUNT on kb_knowledge groupBy author. Log author and count.',
    starter: STARTERS.script,
    solution: `var ga = new GlideAggregate('kb_knowledge');
ga.addAggregate('COUNT');
ga.groupBy('author');
ga.query();
while (ga.next()) {
  gs.info(ga.getValue('author') + ' ' + ga.getAggregate('COUNT'));
}`,
    checks: [
      includes("new GlideAggregate('kb_knowledge')", 'Aggregate'),
      includes("groupBy('author')", 'By author'),
      includes("addAggregate('COUNT')", 'COUNT'),
    ],
  }),
  question({
    id: 'kb-15',
    title: 'Set valid_to 90 days out',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'On insert, if valid_to is empty, set it to now plus 90 days using GlideDateTime addDaysUTC(90).',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.valid_to.nil()) {
    var gdt = new GlideDateTime();
    gdt.addDaysUTC(90);
    current.setValue('valid_to', gdt.getValue());
  }
})(current, previous);`,
    checks: [
      includes('GlideDateTime', 'GlideDateTime'),
      includes('addDaysUTC(90)', 'Plus 90 days'),
      includes('valid_to', 'Set valid_to'),
    ],
  }),
  question({
    id: 'kb-16',
    title: 'Prevent delete of published',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'Before delete: if workflow_state is published, abort and add an error.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.getValue('workflow_state') == 'published') {
    gs.addErrorMessage('Retire the article instead of deleting it.');
    current.setAbortAction(true);
  }
})(current, previous);`,
    checks: [
      includes('published', 'Published check'),
      includes('setAbortAction(true)', 'Abort'),
      includes('gs.addErrorMessage', 'Error'),
    ],
  }),
];
