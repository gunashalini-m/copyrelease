import { question, STARTERS } from './helpers.js';
import { includes, regex, oneOf, allOf } from '../grader.js';

export const TOPIC = {
  id: 'problem',
  title: 'Problem Management',
  blurb: 'Create problems from incidents, investigate root cause, and close with known errors.',
};

export const questions = [
  question({
    id: 'prb-01',
    title: 'Query new problems without assignee',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Query problem records in state New (1) where assigned_to is empty. Log each number.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('problem');
gr.addQuery('state', '1');
gr.addNullQuery('assigned_to');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('number'));
}`,
    checks: [
      includes("new GlideRecord('problem')", 'Use the problem table'),
      regex(/addQuery\(\s*['"]state['"]\s*,\s*['"]1['"]\s*\)/, 'State New (1)'),
      oneOf(["addNullQuery('assigned_to')", 'assigned_toISEMPTY'], 'Unassigned problems'),
      includes('query()', 'Execute query'),
      includes('.next()', 'Iterate'),
    ],
  }),
  question({
    id: 'prb-02',
    title: 'Create a problem from an incident',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Load incident by sys_id incId. Create a problem copying short_description and cmdb_ci. Set first_reported_by_incident to the incident sys_id. Insert, then set incident.problem_id to the new problem and update the incident.',
    starter: `var incId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';\n`,
    solution: `var incId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
var inc = new GlideRecord('incident');
if (inc.get(incId)) {
  var prb = new GlideRecord('problem');
  prb.initialize();
  prb.setValue('short_description', inc.getValue('short_description'));
  prb.setValue('cmdb_ci', inc.getValue('cmdb_ci'));
  prb.setValue('first_reported_by_incident', inc.getUniqueValue());
  var prbId = prb.insert();
  inc.setValue('problem_id', prbId);
  inc.update();
}`,
    checks: [
      includes("new GlideRecord('incident')", 'Load the incident'),
      includes("new GlideRecord('problem')", 'Create a problem'),
      includes('short_description', 'Copy short_description'),
      includes('cmdb_ci', 'Copy CI'),
      includes('first_reported_by_incident', 'Link first reported incident'),
      includes('problem_id', 'Set incident.problem_id'),
      includes('insert()', 'Insert the problem'),
      includes('update()', 'Update the incident'),
    ],
  }),
  question({
    id: 'prb-03',
    title: 'Require workaround before assess',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'Abort if problem state changes to Assess (2) and workaround is empty. Add an error message.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.state.changesTo('2') && current.workaround.nil()) {
    gs.addErrorMessage('Document a workaround before moving to Assess.');
    current.setAbortAction(true);
  }
})(current, previous);`,
    checks: [
      oneOf(["changesTo('2')", 'changesTo(2)'], 'State Assess (2)'),
      oneOf(['workaround.nil()', "getValue('workaround')"], 'Check workaround'),
      includes('gs.addErrorMessage', 'Error message'),
      includes('setAbortAction(true)', 'Abort'),
    ],
  }),
  question({
    id: 'prb-04',
    title: 'Known error flag',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'When knowledge is associated (known_error becomes true) set cause_notes to "See related known error article" if cause_notes is empty.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.known_error.changesTo('true') && current.cause_notes.nil()) {
    current.setValue('cause_notes', 'See related known error article');
  }
})(current, previous);`,
    checks: [
      includes('known_error', 'Watch known_error'),
      includes('cause_notes', 'Set cause_notes'),
      includes('See related known error article', 'Use the specified text'),
    ],
  }),
  question({
    id: 'prb-05',
    title: 'Related incidents still open',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Count active incidents where problem_id equals prbId using GlideAggregate. Log the count.',
    starter: `var prbId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';\n`,
    solution: `var prbId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
var ga = new GlideAggregate('incident');
ga.addQuery('problem_id', prbId);
ga.addQuery('active', true);
ga.addAggregate('COUNT');
ga.query();
if (ga.next()) {
  gs.info(ga.getAggregate('COUNT'));
}`,
    checks: [
      includes("new GlideAggregate('incident')", 'Aggregate incidents'),
      includes('problem_id', 'Filter problem_id'),
      includes("addAggregate('COUNT')", 'COUNT'),
      includes('getAggregate', 'Read COUNT'),
    ],
  }),
  question({
    id: 'prb-06',
    title: 'Create a problem task',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Insert a problem_task for problem prbId with short_description "Collect logs" and state Open (1).',
    starter: `var prbId = 'cccccccccccccccccccccccccccccccc';\n`,
    solution: `var prbId = 'cccccccccccccccccccccccccccccccc';
var task = new GlideRecord('problem_task');
task.initialize();
task.setValue('problem', prbId);
task.setValue('short_description', 'Collect logs');
task.setValue('state', '1');
task.insert();`,
    checks: [
      includes("new GlideRecord('problem_task')", 'problem_task table'),
      includes('problem', 'Link to the problem'),
      includes('Collect logs', 'Short description'),
      includes('insert()', 'Insert'),
    ],
  }),
  question({
    id: 'prb-07',
    title: 'Close problem tasks when problem closes',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'When problem state changes to Closed (3), set related problem_task records to Closed Complete (3) with setWorkflow(false).',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.state.changesTo('3')) {
    var task = new GlideRecord('problem_task');
    task.addQuery('problem', current.getUniqueValue());
    task.addQuery('state', '!=', '3');
    task.query();
    while (task.next()) {
      task.setValue('state', '3');
      task.setWorkflow(false);
      task.update();
    }
  }
})(current, previous);`,
    checks: [
      includes("new GlideRecord('problem_task')", 'Query problem tasks'),
      includes('problem', 'Match parent problem'),
      regex(/setValue\(\s*['"]state['"]\s*,\s*['"]3['"]\s*\)/, 'Close tasks'),
      includes('setWorkflow(false)', 'Skip extra engines'),
    ],
  }),
  question({
    id: 'prb-08',
    title: 'Client: hide workaround until RCA',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'onLoad: if state is New (1), hide field workaround. Otherwise show it.',
    starter: STARTERS.clientLoad,
    solution: `function onLoad() {
  var state = g_form.getValue('state');
  g_form.setDisplay('workaround', state != '1');
}`,
    checks: [
      includes("g_form.getValue('state')", 'Read state'),
      includes("g_form.setDisplay('workaround'", 'Toggle workaround display'),
    ],
  }),
  question({
    id: 'prb-09',
    title: 'Copy problem fix to incidents',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'When writing a fix, copy problem fix_notes onto additional comments of all incidents linked via problem_id. Use setWorkflow(false).',
    starter: `var prbId = 'dddddddddddddddddddddddddddddddd';
var fix = 'Restart the listener process';
`,
    solution: `var prbId = 'dddddddddddddddddddddddddddddddd';
var fix = 'Restart the listener process';
var inc = new GlideRecord('incident');
inc.addQuery('problem_id', prbId);
inc.query();
while (inc.next()) {
  inc.comments = fix;
  inc.setWorkflow(false);
  inc.update();
}`,
    checks: [
      includes("new GlideRecord('incident')", 'Update incidents'),
      includes('problem_id', 'Linked incidents'),
      oneOf(['inc.comments', "setValue('comments'", "setValue('additional_comments'"], 'Write comments'),
      includes('update()', 'Save'),
    ],
  }),
  question({
    id: 'prb-10',
    title: 'Duplicate problem check',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Before insert logic: query other problems with the same cmdb_ci and active=true. If any exist, gs.info the existing number and do not insert a duplicate—just log "DUPLICATE". If none, insert is assumed to happen elsewhere; log "UNIQUE". Use ciId.',
    starter: `var ciId = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';\n`,
    solution: `var ciId = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
var gr = new GlideRecord('problem');
gr.addQuery('cmdb_ci', ciId);
gr.addQuery('active', true);
gr.setLimit(1);
gr.query();
if (gr.next()) {
  gs.info(gr.getValue('number'));
  gs.info('DUPLICATE');
} else {
  gs.info('UNIQUE');
}`,
    checks: [
      includes("new GlideRecord('problem')", 'Query problems'),
      includes('cmdb_ci', 'Same CI'),
      includes('DUPLICATE', 'Log DUPLICATE'),
      includes('UNIQUE', 'Log UNIQUE'),
    ],
  }),
  question({
    id: 'prb-11',
    title: 'Event problem.closed',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'When state changes to Closed (3), queue event problem.closed with parm1 = number.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.state.changesTo('3')) {
    gs.eventQueue('problem.closed', current, current.getValue('number'), '');
  }
})(current, previous);`,
    checks: [
      includes('gs.eventQueue', 'eventQueue'),
      includes('problem.closed', 'Event name'),
      includes("getValue('number')", 'Parm1 is number'),
    ],
  }),
  question({
    id: 'prb-12',
    title: 'GlideAjax getProblemState',
    difficulty: 'intermediate',
    kind: 'script_include',
    prompt: 'Script Include ProblemAjax.getState reads sysparm_sys_id, loads the problem, returns state.',
    starter: STARTERS.glideAjax,
    solution: `var ProblemAjax = Class.create();
ProblemAjax.prototype = Object.extend(new AbstractAjaxProcessor(), {
  getState: function() {
    var id = this.getParameter('sysparm_sys_id');
    var gr = new GlideRecord('problem');
    if (gr.get(id)) {
      return gr.getValue('state');
    }
    return '';
  },
  type: 'ProblemAjax'
});`,
    checks: [
      includes('AbstractAjaxProcessor', 'Ajax processor'),
      includes('getState', 'getState method'),
      includes("getParameter('sysparm_sys_id')", 'Read sysparm_sys_id'),
      includes("new GlideRecord('problem')", 'Load problem'),
      includes("getValue('state')", 'Return state'),
    ],
  }),
  question({
    id: 'prb-13',
    title: 'Assign to Problem Management group',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'If assignment_group is empty, set it from sys_user_group named "Problem Management".',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.assignment_group.nil()) {
    var g = new GlideRecord('sys_user_group');
    if (g.get('name', 'Problem Management')) {
      current.setValue('assignment_group', g.getUniqueValue());
    }
  }
})(current, previous);`,
    checks: [
      includes("new GlideRecord('sys_user_group')", 'Look up group'),
      includes('Problem Management', 'Group name'),
      includes('assignment_group', 'Set assignment_group'),
    ],
  }),
  question({
    id: 'prb-14',
    title: 'onChange: known error article mandatory',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'onChange of known_error: if true, make knowledge mandatory; else not mandatory.',
    starter: STARTERS.client,
    solution: `function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading) {
    return;
  }
  g_form.setMandatory('knowledge', newValue == 'true');
}`,
    checks: [
      includes("g_form.setMandatory('knowledge'", 'knowledge mandatory'),
      oneOf(["newValue == 'true'", 'newValue === \'true\'', 'newValue == true'], 'When known_error is true'),
    ],
  }),
  question({
    id: 'prb-15',
    title: 'Encoded query: high priority open problems',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'addEncodedQuery priority=1^ORpriority=2^active=true on problem, orderBy priority, log numbers.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('problem');
gr.addEncodedQuery('priority=1^ORpriority=2^active=true');
gr.orderBy('priority');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('number'));
}`,
    checks: [
      includes('addEncodedQuery', 'Encoded query'),
      includes('priority=1', 'P1'),
      includes('^ORpriority=2', 'OR P2'),
      includes('active=true', 'Active'),
      includes("orderBy('priority')", 'Order by priority'),
    ],
  }),
  question({
    id: 'prb-16',
    title: 'Prevent delete with related incidents',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'Before delete on problem: if any incident has this problem_id, abort and add an error message.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  var inc = new GlideRecord('incident');
  inc.addQuery('problem_id', current.getUniqueValue());
  inc.setLimit(1);
  inc.query();
  if (inc.hasNext()) {
    gs.addErrorMessage('Cannot delete a problem with related incidents.');
    current.setAbortAction(true);
  }
})(current, previous);`,
    checks: [
      includes("new GlideRecord('incident')", 'Check incidents'),
      includes('problem_id', 'Match problem_id'),
      includes('setAbortAction(true)', 'Abort delete'),
      includes('gs.addErrorMessage', 'Error message'),
    ],
  }),
];
