import { question, STARTERS } from './helpers.js';
import { includes, regex, oneOf, allOf, order, excludes } from '../grader.js';

export const TOPIC = {
  id: 'incident',
  title: 'Incident Management',
  blurb: 'Query, route, escalate, and close incidents with GlideRecord, Business Rules, and client scripts.',
};

export const questions = [
  question({
    id: 'inc-01',
    title: 'Query active Priority 1 incidents',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Write a server script that queries the incident table for active Priority 1 records and logs each incident number with gs.info.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('incident');
gr.addQuery('active', true);
gr.addQuery('priority', '1');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('number'));
}`,
    checks: [
      includes("new GlideRecord('incident')", 'Create a GlideRecord on incident'),
      includes('addQuery', 'Filter with addQuery'),
      oneOf(["addQuery('active'", 'addActiveQuery()'], 'Limit to active incidents'),
      regex(/addQuery\(\s*['"]priority['"]\s*,\s*['"]1['"]\s*\)/, 'Filter priority 1'),
      includes('query()', 'Call query()'),
      includes('.next()', 'Iterate with next()'),
      includes('gs.info', 'Log with gs.info'),
    ],
    hint: 'Use two addQuery calls (or addActiveQuery) then while (gr.next()).',
  }),
  question({
    id: 'inc-02',
    title: 'Create an incident for the current user',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Insert a new incident: short_description "Email outage", caller_id = the current user, impact 2, urgency 2. Insert and log the new number.',
    starter: STARTERS.script,
    solution: `var inc = new GlideRecord('incident');
inc.initialize();
inc.setValue('short_description', 'Email outage');
inc.setValue('caller_id', gs.getUserID());
inc.setValue('impact', '2');
inc.setValue('urgency', '2');
inc.insert();
gs.info(inc.getValue('number'));`,
    checks: [
      includes("new GlideRecord('incident')", 'Use the incident table'),
      oneOf(['initialize()', 'newRecord()'], 'Initialize a new record'),
      includes('short_description', 'Set short_description'),
      includes('Email outage', 'Use the specified short description'),
      includes('caller_id', 'Set caller_id'),
      includes('gs.getUserID()', 'Caller is the current user'),
      includes('impact', 'Set impact'),
      includes('urgency', 'Set urgency'),
      includes('insert()', 'Insert the record'),
    ],
    hint: 'initialize(), setValue for each field, then insert().',
  }),
  question({
    id: 'inc-03',
    title: 'Business Rule: abort close without close notes',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'On incident, when state changes to Closed (7), abort the action if close_notes is empty and add an error message telling the user to enter close notes.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.state.changesTo('7') && current.close_notes.nil()) {
    gs.addErrorMessage('Enter close notes before closing the incident.');
    current.setAbortAction(true);
  }
})(current, previous);`,
    checks: [
      oneOf(["changesTo('7')", 'changesTo(7)', "getValue('state')"], 'Detect close (state 7)'),
      oneOf(['close_notes.nil()', "gs.nil(current.close_notes)", "getValue('close_notes')"], 'Check close_notes'),
      includes('gs.addErrorMessage', 'Show an error message'),
      includes('setAbortAction(true)', 'Abort the update'),
    ],
    hint: 'current.state.changesTo(\'7\') and current.close_notes.nil().',
  }),
  question({
    id: 'inc-04',
    title: 'Auto-assign Service Desk group',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'Before insert on incident: if assignment_group is empty, set it to the sys_user_group whose name is "Service Desk".',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.assignment_group.nil()) {
    var grp = new GlideRecord('sys_user_group');
    if (grp.get('name', 'Service Desk')) {
      current.setValue('assignment_group', grp.getUniqueValue());
    }
  }
})(current, previous);`,
    checks: [
      oneOf(['assignment_group.nil()', "gs.nil(current.assignment_group)"], 'Check empty assignment_group'),
      includes("new GlideRecord('sys_user_group')", 'Look up sys_user_group'),
      includes('Service Desk', 'Find the Service Desk group'),
      includes('assignment_group', 'Set assignment_group'),
      oneOf(['getUniqueValue()', 'grp.sys_id', 'grp.getValue(\'sys_id\')'], 'Use the group sys_id'),
    ],
    hint: 'grp.get(\'name\', \'Service Desk\') then set assignment_group.',
  }),
  question({
    id: 'inc-05',
    title: 'Copy work notes into additional comments',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'When work_notes changes on an incident, append the same text to additional_comments (comments).',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.work_notes.changes()) {
    current.comments = current.work_notes.getJournalEntry(1);
  }
})(current, previous);`,
    checks: [
      includes('work_notes.changes()', 'Run when work_notes changes'),
      oneOf(['current.comments', "setValue('comments'", "setValue('additional_comments'"], 'Write additional comments'),
      oneOf(['getJournalEntry', 'work_notes'], 'Use the work notes value'),
    ],
    hint: 'Journal fields: getJournalEntry(1) for the latest entry.',
  }),
  question({
    id: 'inc-06',
    title: 'Count open incidents for a CI',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Given a CI sys_id in variable ciId, use GlideAggregate to count active incidents where cmdb_ci equals that CI. Log the count.',
    starter: `var ciId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';\n`,
    solution: `var ciId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
var ga = new GlideAggregate('incident');
ga.addQuery('cmdb_ci', ciId);
ga.addQuery('active', true);
ga.addAggregate('COUNT');
ga.query();
if (ga.next()) {
  gs.info(ga.getAggregate('COUNT'));
}`,
    checks: [
      includes("new GlideAggregate('incident')", 'Use GlideAggregate on incident'),
      includes('cmdb_ci', 'Filter on cmdb_ci'),
      includes('ciId', 'Use the provided CI sys_id'),
      includes("addAggregate('COUNT')", 'COUNT aggregate'),
      includes('getAggregate', 'Read the aggregate'),
      includes('gs.info', 'Log the result'),
    ],
    hint: 'addAggregate(\'COUNT\') then getAggregate(\'COUNT\').',
  }),
  question({
    id: 'inc-07',
    title: 'Client script: mandatory description on P1',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'onChange of priority: if the new value is 1, make description mandatory; otherwise not mandatory.',
    starter: STARTERS.client,
    solution: `function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading) {
    return;
  }
  g_form.setMandatory('description', newValue == '1');
}`,
    checks: [
      includes('g_form.setMandatory', 'Use g_form.setMandatory'),
      includes('description', 'Target the description field'),
      oneOf(["newValue == '1'", 'newValue === \'1\'', 'newValue == 1', 'newValue === \'1\''], 'When priority is 1'),
    ],
    hint: 'g_form.setMandatory(\'description\', newValue == \'1\').',
  }),
  question({
    id: 'inc-08',
    title: 'Escalate to a major incident',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Load incident INC0000001 by number. Set major_incident_state to "accepted", impact to 1, urgency to 1, and update the record.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('incident');
if (gr.get('number', 'INC0000001')) {
  gr.setValue('major_incident_state', 'accepted');
  gr.setValue('impact', '1');
  gr.setValue('urgency', '1');
  gr.update();
}`,
    checks: [
      includes("new GlideRecord('incident')", 'Query incident'),
      includes('INC0000001', 'Look up INC0000001'),
      includes('major_incident_state', 'Set major incident state'),
      includes('accepted', 'Accepted major incident'),
      includes('update()', 'Save the record'),
    ],
    hint: 'gr.get(\'number\', \'INC0000001\').',
  }),
  question({
    id: 'inc-09',
    title: 'Reopen a resolved incident',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'For a given incident sys_id in incId, if state is Resolved (6), set state to In Progress (2), clear resolved_at, and update.',
    starter: `var incId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';\n`,
    solution: `var incId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
var gr = new GlideRecord('incident');
if (gr.get(incId) && gr.getValue('state') == '6') {
  gr.setValue('state', '2');
  gr.setValue('resolved_at', '');
  gr.update();
}`,
    checks: [
      includes('.get(', 'Load by sys_id'),
      oneOf(["getValue('state')", 'gr.state'], 'Read state'),
      regex(/setValue\(\s*['"]state['"]\s*,\s*['"]2['"]\s*\)|state\s*=\s*['"]2['"]/, 'Set state to 2'),
      includes('resolved_at', 'Clear resolved_at'),
      includes('update()', 'Update'),
    ],
    hint: 'Check state == 6 before setting state to 2.',
  }),
  question({
    id: 'inc-10',
    title: 'Queue an incident assigned event',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'When assigned_to changes to a non-empty value, queue event incident.assigned with parm1 = assigned_to user name and parm2 = incident number.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.assigned_to.changes() && !current.assigned_to.nil()) {
    gs.eventQueue(
      'incident.assigned',
      current,
      current.assigned_to.getDisplayValue(),
      current.getValue('number')
    );
  }
})(current, previous);`,
    checks: [
      includes('assigned_to.changes()', 'Watch assigned_to'),
      includes('gs.eventQueue', 'Queue an event'),
      includes('incident.assigned', 'Event name incident.assigned'),
      includes('current', 'Pass the incident record'),
    ],
    hint: 'gs.eventQueue(name, current, parm1, parm2).',
  }),
  question({
    id: 'inc-11',
    title: 'GlideAjax: open incident count',
    difficulty: 'intermediate',
    kind: 'script_include',
    prompt: 'Client-callable Script Include IncidentUtilsAjax with method getOpenCount. Read sysparm_caller, count active incidents for that caller_id, return the count as a string.',
    starter: STARTERS.glideAjax,
    solution: `var IncidentUtilsAjax = Class.create();
IncidentUtilsAjax.prototype = Object.extend(new AbstractAjaxProcessor(), {
  getOpenCount: function() {
    var caller = this.getParameter('sysparm_caller');
    var ga = new GlideAggregate('incident');
    ga.addQuery('caller_id', caller);
    ga.addQuery('active', true);
    ga.addAggregate('COUNT');
    ga.query();
    return ga.next() ? ga.getAggregate('COUNT') : '0';
  },
  type: 'IncidentUtilsAjax'
});`,
    checks: [
      includes('AbstractAjaxProcessor', 'Extend AbstractAjaxProcessor'),
      includes('getOpenCount', 'Implement getOpenCount'),
      includes("getParameter('sysparm_caller')", 'Read sysparm_caller'),
      oneOf(['GlideAggregate', 'GlideRecord'], 'Query incidents'),
      includes('caller_id', 'Filter by caller'),
    ],
    hint: 'this.getParameter(\'sysparm_caller\') then GlideAggregate COUNT.',
  }),
  question({
    id: 'inc-12',
    title: 'Parent incident close child incidents',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'After update: if this incident is a parent (parent_incident is empty) and state changes to Closed (7), close all child incidents whose parent_incident is this record (state 7, close_code "Closed/Resolved by parent"). Use updateMultiple or a loop with setWorkflow(false) to avoid recursion.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.parent_incident.nil() && current.state.changesTo('7')) {
    var child = new GlideRecord('incident');
    child.addQuery('parent_incident', current.getUniqueValue());
    child.addQuery('active', true);
    child.query();
    while (child.next()) {
      child.setValue('state', '7');
      child.setValue('close_code', 'Closed/Resolved by parent');
      child.setWorkflow(false);
      child.update();
    }
  }
})(current, previous);`,
    checks: [
      includes("new GlideRecord('incident')", 'Query child incidents'),
      includes('parent_incident', 'Match parent_incident'),
      regex(/setValue\(\s*['"]state['"]\s*,\s*['"]7['"]\s*\)|state\s*=\s*['"]7['"]/, 'Close children (state 7)'),
      includes('close_code', 'Set close_code'),
      oneOf(['setWorkflow(false)', 'updateMultiple()'], 'Avoid recursive engines or use updateMultiple'),
    ],
    hint: 'Query parent_incident = current.sys_id, then update each child.',
  }),
  question({
    id: 'inc-13',
    title: 'Priority from impact and urgency',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'If impact is 1 and urgency is 1, set priority to 1. If either impact or urgency is 1 and the other is 2, set priority to 2. Otherwise leave priority unchanged. Use getValue/setValue.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  var impact = current.getValue('impact');
  var urgency = current.getValue('urgency');
  if (impact == '1' && urgency == '1') {
    current.setValue('priority', '1');
  } else if ((impact == '1' && urgency == '2') || (impact == '2' && urgency == '1')) {
    current.setValue('priority', '2');
  }
})(current, previous);`,
    checks: [
      includes("getValue('impact')", 'Read impact'),
      includes("getValue('urgency')", 'Read urgency'),
      includes("setValue('priority'", 'Set priority'),
      regex(/priority['"]\s*,\s*['"]1['"]/, 'Set priority 1 for 1/1'),
      regex(/priority['"]\s*,\s*['"]2['"]/, 'Set priority 2 for mixed 1 and 2'),
    ],
    hint: 'Compare impact/urgency strings, then setValue(\'priority\', ...).',
  }),
  question({
    id: 'inc-14',
    title: 'onSubmit: block empty assignment',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'onSubmit client script: if assignment_group is empty, show an error message and return false. Otherwise return true.',
    starter: STARTERS.clientSubmit,
    solution: `function onSubmit() {
  if (!g_form.getValue('assignment_group')) {
    g_form.addErrorMessage('Assignment group is required.');
    return false;
  }
  return true;
}`,
    checks: [
      includes("g_form.getValue('assignment_group')", 'Read assignment_group'),
      includes('g_form.addErrorMessage', 'Show an error'),
      includes('return false', 'Block submit'),
      includes('return true', 'Allow submit when valid'),
    ],
    hint: 'Return false to cancel submit.',
  }),
  question({
    id: 'inc-15',
    title: 'Encoded query: VIP P2 opened today',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Query incidents with addEncodedQuery for caller_id.vip=true^priority=2^opened_atONToday. Order by opened_at descending. Log numbers.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('incident');
gr.addEncodedQuery('caller_id.vip=true^priority=2^opened_atONToday');
gr.orderByDesc('opened_at');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('number'));
}`,
    checks: [
      includes('addEncodedQuery', 'Use addEncodedQuery'),
      includes('caller_id.vip=true', 'VIP caller'),
      includes('priority=2', 'Priority 2'),
      includes('opened_atONToday', 'Opened today'),
      includes('orderByDesc', 'Newest first'),
      includes('opened_at', 'Sort by opened_at'),
    ],
    hint: 'Dot-walk caller_id.vip in the encoded query.',
  }),
  question({
    id: 'inc-16',
    title: 'Related incident tasks still open',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'For incident sys_id incId, query incident_task where incident matches and state is not Closed (3). If any exist, log "OPEN_TASKS" otherwise "CLEAR".',
    starter: `var incId = 'cccccccccccccccccccccccccccccccc';\n`,
    solution: `var incId = 'cccccccccccccccccccccccccccccccc';
var task = new GlideRecord('incident_task');
task.addQuery('incident', incId);
task.addQuery('state', '!=', '3');
task.setLimit(1);
task.query();
if (task.hasNext()) {
  gs.info('OPEN_TASKS');
} else {
  gs.info('CLEAR');
}`,
    checks: [
      includes("new GlideRecord('incident_task')", 'Query incident_task'),
      includes('incident', 'Relate to the incident'),
      oneOf(["addQuery('state', '!=', '3')", 'addQuery("state", "!=", "3")', 'state!=3'], 'Exclude closed state 3'),
      oneOf(['hasNext()', '.next()'], 'Test whether a row exists'),
      includes('OPEN_TASKS', 'Log OPEN_TASKS'),
      includes('CLEAR', 'Log CLEAR'),
    ],
    hint: 'addQuery(\'state\', \'!=\', \'3\') and hasNext().',
  }),
];
