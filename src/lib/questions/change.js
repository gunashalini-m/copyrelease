import { question, STARTERS } from './helpers.js';
import { includes, regex, oneOf } from '../grader.js';

export const TOPIC = {
  id: 'change',
  title: 'Change Management',
  blurb: 'Normal, standard, and emergency changes: risk, approvals, scheduling, and tasks.',
};

export const questions = [
  question({
    id: 'chg-01',
    title: 'Query emergency changes this week',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Query change_request where type is emergency and active is true. Log each number.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('change_request');
gr.addQuery('type', 'emergency');
gr.addQuery('active', true);
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('number'));
}`,
    checks: [
      includes("new GlideRecord('change_request')", 'change_request table'),
      includes("addQuery('type', 'emergency')", 'Emergency type'),
      includes('query()', 'Query'),
      includes('.next()', 'Iterate'),
    ],
  }),
  question({
    id: 'chg-02',
    title: 'Create a normal change',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Insert a change_request: type normal, short_description "Patch Windows cluster", risk moderate, impact 2. Log the number after insert.',
    starter: STARTERS.script,
    solution: `var chg = new GlideRecord('change_request');
chg.initialize();
chg.setValue('type', 'normal');
chg.setValue('short_description', 'Patch Windows cluster');
chg.setValue('risk', 'moderate');
chg.setValue('impact', '2');
chg.insert();
gs.info(chg.getValue('number'));`,
    checks: [
      includes("new GlideRecord('change_request')", 'change_request'),
      includes("setValue('type', 'normal')", 'Type normal'),
      includes('Patch Windows cluster', 'Description'),
      includes('moderate', 'Risk moderate'),
      includes('insert()', 'Insert'),
    ],
  }),
  question({
    id: 'chg-03',
    title: 'Abort if planned end before start',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'If end_date is before start_date, abort and add an error message. Use GlideDateTime compareTo.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  var start = new GlideDateTime(current.getValue('start_date'));
  var end = new GlideDateTime(current.getValue('end_date'));
  if (!gs.nil(current.start_date) && !gs.nil(current.end_date) && end.compareTo(start) < 0) {
    gs.addErrorMessage('Planned end must be after planned start.');
    current.setAbortAction(true);
  }
})(current, previous);`,
    checks: [
      includes('GlideDateTime', 'Use GlideDateTime'),
      includes('start_date', 'Read start_date'),
      includes('end_date', 'Read end_date'),
      includes('compareTo', 'Compare dates'),
      includes('setAbortAction(true)', 'Abort'),
    ],
  }),
  question({
    id: 'chg-04',
    title: 'Standard change skip CAB',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'If type is standard, set cab_required to false.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.getValue('type') == 'standard') {
    current.setValue('cab_required', false);
  }
})(current, previous);`,
    checks: [
      includes("getValue('type')", 'Read type'),
      includes('standard', 'Standard changes'),
      includes('cab_required', 'Set cab_required'),
    ],
  }),
  question({
    id: 'chg-05',
    title: 'Create implementation change task',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Insert change_task for change chgId with short_description "Implement" and change_task_type implementation.',
    starter: `var chgId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';\n`,
    solution: `var chgId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
var t = new GlideRecord('change_task');
t.initialize();
t.setValue('change_request', chgId);
t.setValue('short_description', 'Implement');
t.setValue('change_task_type', 'implementation');
t.insert();`,
    checks: [
      includes("new GlideRecord('change_task')", 'change_task'),
      includes('change_request', 'Parent change'),
      includes('Implement', 'Short description'),
      includes('implementation', 'Task type'),
      includes('insert()', 'Insert'),
    ],
  }),
  question({
    id: 'chg-06',
    title: 'Unauthorized emergency',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'If type changes to emergency and gs.hasRole("itil") is true but gs.hasRole("itil_admin") is false and gs.hasRole("admin") is false, abort with an error (only admins / itil_admin may create emergency here).',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.type.changesTo('emergency') && !gs.hasRole('itil_admin') && !gs.hasRole('admin')) {
    gs.addErrorMessage('Only change admins can submit emergency changes.');
    current.setAbortAction(true);
  }
})(current, previous);`,
    checks: [
      includes("changesTo('emergency')", 'Detect emergency'),
      includes("gs.hasRole('itil_admin')", 'Check itil_admin'),
      includes("gs.hasRole('admin')", 'Check admin'),
      includes('setAbortAction(true)', 'Abort'),
    ],
  }),
  question({
    id: 'chg-07',
    title: 'Copy CI from request to change',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Load sc_req_item ritmId and create a change_request copying cmdb_ci and short_description. Set requested_by from the RITM requested_for.',
    starter: `var ritmId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';\n`,
    solution: `var ritmId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
var ritm = new GlideRecord('sc_req_item');
if (ritm.get(ritmId)) {
  var chg = new GlideRecord('change_request');
  chg.initialize();
  chg.setValue('cmdb_ci', ritm.getValue('cmdb_ci'));
  chg.setValue('short_description', ritm.getValue('short_description'));
  chg.setValue('requested_by', ritm.getValue('requested_for'));
  chg.insert();
}`,
    checks: [
      includes("new GlideRecord('sc_req_item')", 'Load RITM'),
      includes("new GlideRecord('change_request')", 'Create change'),
      includes('cmdb_ci', 'Copy CI'),
      includes('requested_by', 'Set requested_by'),
      includes('requested_for', 'From requested_for'),
    ],
  }),
  question({
    id: 'chg-08',
    title: 'Client: conflict message on dates',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'onChange of start_date: if g_form.getValue("outside_maintenance") is true, show a field message on start_date of type warning about CAB overlap. Use showFieldMsg.',
    starter: STARTERS.client,
    solution: `function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || newValue === '') {
    return;
  }
  if (g_form.getValue('outside_maintenance') == 'true') {
    g_form.showFieldMsg('start_date', 'This window is outside maintenance. Expect CAB discussion.', 'warning');
  }
}`,
    checks: [
      includes('g_form.showFieldMsg', 'showFieldMsg'),
      includes('start_date', 'On start_date'),
      includes('warning', 'Warning type'),
      includes('outside_maintenance', 'Check outside_maintenance'),
    ],
  }),
  question({
    id: 'chg-09',
    title: 'Close remaining change tasks',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'When change state is Closed (3) or Canceled (4), close open change_task (state 3) with setWorkflow(false). Treat any state != 3 as open.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  var st = current.getValue('state');
  if (st == '3' || st == '4') {
    var t = new GlideRecord('change_task');
    t.addQuery('change_request', current.getUniqueValue());
    t.addQuery('state', '!=', '3');
    t.query();
    while (t.next()) {
      t.setValue('state', '3');
      t.setWorkflow(false);
      t.update();
    }
  }
})(current, previous);`,
    checks: [
      includes("new GlideRecord('change_task')", 'change_task'),
      includes('change_request', 'Parent change'),
      includes('setWorkflow(false)', 'setWorkflow false'),
      includes('update()', 'Update tasks'),
    ],
  }),
  question({
    id: 'chg-10',
    title: 'Count changes on a CI last 30 days',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'GlideAggregate COUNT of change_request where cmdb_ci = ciId and sys_created_on is on or after gs.daysAgo(30). Log the count.',
    starter: `var ciId = 'cccccccccccccccccccccccccccccccc';\n`,
    solution: `var ciId = 'cccccccccccccccccccccccccccccccc';
var ga = new GlideAggregate('change_request');
ga.addQuery('cmdb_ci', ciId);
ga.addQuery('sys_created_on', '>=', gs.daysAgo(30));
ga.addAggregate('COUNT');
ga.query();
if (ga.next()) {
  gs.info(ga.getAggregate('COUNT'));
}`,
    checks: [
      includes("new GlideAggregate('change_request')", 'Aggregate changes'),
      includes('cmdb_ci', 'Filter CI'),
      includes('gs.daysAgo(30)', 'Last 30 days'),
      includes("addAggregate('COUNT')", 'COUNT'),
    ],
  }),
  question({
    id: 'chg-11',
    title: 'Queue change.approval.required',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'When state changes to Assess (2), queue change.approval.required with parm1 = assignment_group display value.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.state.changesTo('2')) {
    gs.eventQueue('change.approval.required', current, current.assignment_group.getDisplayValue(), '');
  }
})(current, previous);`,
    checks: [
      includes("changesTo('2')", 'Assess state'),
      includes('gs.eventQueue', 'Queue event'),
      includes('change.approval.required', 'Event name'),
    ],
  }),
  question({
    id: 'chg-12',
    title: 'Risk calculation stub',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'If impact is 1, set risk to high. Else if impact is 2, set risk to moderate. Else set risk to low.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  var impact = current.getValue('impact');
  if (impact == '1') {
    current.setValue('risk', 'high');
  } else if (impact == '2') {
    current.setValue('risk', 'moderate');
  } else {
    current.setValue('risk', 'low');
  }
})(current, previous);`,
    checks: [
      includes("getValue('impact')", 'Read impact'),
      includes("setValue('risk', 'high')", 'High risk'),
      includes("setValue('risk', 'moderate')", 'Moderate'),
      includes("setValue('risk', 'low')", 'Low'),
    ],
  }),
  question({
    id: 'chg-13',
    title: 'GlideAjax: isChangeBlackout',
    difficulty: 'intermediate',
    kind: 'script_include',
    prompt: 'ChangeAjax.inBlackout reads sysparm_start. If it contains "2026-12-25" return "true" else "false". (Simulated blackout check.)',
    starter: STARTERS.glideAjax,
    solution: `var ChangeAjax = Class.create();
ChangeAjax.prototype = Object.extend(new AbstractAjaxProcessor(), {
  inBlackout: function() {
    var start = this.getParameter('sysparm_start') || '';
    return start.indexOf('2026-12-25') >= 0 ? 'true' : 'false';
  },
  type: 'ChangeAjax'
});`,
    checks: [
      includes('AbstractAjaxProcessor', 'Ajax processor'),
      includes('inBlackout', 'Method name'),
      includes("getParameter('sysparm_start')", 'Read start'),
      includes('2026-12-25', 'Blackout date'),
    ],
  }),
  question({
    id: 'chg-14',
    title: 'onSubmit: CAB notes when high risk',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'If risk is high and cab_recommendation is empty, addErrorMessage and return false.',
    starter: STARTERS.clientSubmit,
    solution: `function onSubmit() {
  if (g_form.getValue('risk') == 'high' && !g_form.getValue('cab_recommendation')) {
    g_form.addErrorMessage('CAB recommendation is required for high risk changes.');
    return false;
  }
  return true;
}`,
    checks: [
      includes("g_form.getValue('risk')", 'Read risk'),
      includes('high', 'High risk'),
      includes('cab_recommendation', 'CAB recommendation'),
      includes('return false', 'Block submit'),
    ],
  }),
  question({
    id: 'chg-15',
    title: 'Encoded query: scheduled tonight',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Query change_request with addEncodedQuery work_startONToday^state=2. Log numbers.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('change_request');
gr.addEncodedQuery('work_startONToday^state=2');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('number'));
}`,
    checks: [
      includes('addEncodedQuery', 'Encoded query'),
      includes('work_startONToday', 'Work start today'),
    ],
  }),
  question({
    id: 'chg-16',
    title: 'Link backout plan comments',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'When backout_plan changes, copy its latest journal/text into comments. If it is a string field, assign current.comments = current.backout_plan.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.backout_plan.changes()) {
    current.comments = current.getValue('backout_plan');
  }
})(current, previous);`,
    checks: [
      includes('backout_plan.changes()', 'When backout_plan changes'),
      oneOf(['current.comments', "setValue('comments'"], 'Write comments'),
    ],
  }),
];
