import { question, STARTERS } from './helpers.js';
import { includes, oneOf, regex } from '../grader.js';

export const TOPIC = {
  id: 'major_incident',
  title: 'Major Incident',
  blurb: 'Major incident state, communication plans, workbench fields, and related incidents.',
};

export const questions = [
  question({
    id: 'mim-01',
    title: 'Query accepted major incidents',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Query incident where major_incident_state is accepted and active is true. Log number.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('incident');
gr.addQuery('major_incident_state', 'accepted');
gr.addQuery('active', true);
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('number'));
}`,
    checks: [
      includes("new GlideRecord('incident')", 'incident'),
      includes("addQuery('major_incident_state', 'accepted')", 'Accepted MIM'),
      includes('query()', 'Query'),
    ],
  }),
  question({
    id: 'mim-02',
    title: 'Propose a major incident',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Load INC0000450 by number, set major_incident_state to proposed, update.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('incident');
if (gr.get('number', 'INC0000450')) {
  gr.setValue('major_incident_state', 'proposed');
  gr.update();
}`,
    checks: [
      includes('INC0000450', 'Incident number'),
      includes("setValue('major_incident_state', 'proposed')", 'Proposed'),
      includes('update()', 'Update'),
    ],
  }),
  question({
    id: 'mim-03',
    title: 'Accept MIM sets impact/urgency',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'When major_incident_state changes to accepted, set impact 1, urgency 1, and priority 1.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.major_incident_state.changesTo('accepted')) {
    current.setValue('impact', '1');
    current.setValue('urgency', '1');
    current.setValue('priority', '1');
  }
})(current, previous);`,
    checks: [
      includes("changesTo('accepted')", 'Accepted'),
      includes("setValue('impact', '1')", 'Impact 1'),
      includes("setValue('urgency', '1')", 'Urgency 1'),
      includes("setValue('priority', '1')", 'Priority 1'),
    ],
  }),
  question({
    id: 'mim-04',
    title: 'Reject proposal',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'For incId, set major_incident_state to rejected and add a work note "Not a major incident".',
    starter: `var incId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';\n`,
    solution: `var incId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
var gr = new GlideRecord('incident');
if (gr.get(incId)) {
  gr.setValue('major_incident_state', 'rejected');
  gr.work_notes = 'Not a major incident';
  gr.update();
}`,
    checks: [
      includes('rejected', 'Rejected'),
      includes('Not a major incident', 'Work note'),
      includes('update()', 'Update'),
    ],
  }),
  question({
    id: 'mim-05',
    title: 'Queue major incident communication event',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'When major_incident_state changes to accepted, queue incident.major.accepted with parm1 = number.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.major_incident_state.changesTo('accepted')) {
    gs.eventQueue('incident.major.accepted', current, current.getValue('number'), '');
  }
})(current, previous);`,
    checks: [
      includes('gs.eventQueue', 'eventQueue'),
      includes('incident.major.accepted', 'Event name'),
    ],
  }),
  question({
    id: 'mim-06',
    title: 'Link child incidents to MIM',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Query active incidents with matching cmdb_ci ciId excluding parentId. Set parent_incident to parentId and update with setWorkflow(false).',
    starter: `var parentId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
var ciId = 'cccccccccccccccccccccccccccccccc';
`,
    solution: `var parentId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
var ciId = 'cccccccccccccccccccccccccccccccc';
var gr = new GlideRecord('incident');
gr.addQuery('cmdb_ci', ciId);
gr.addQuery('active', true);
gr.addQuery('sys_id', '!=', parentId);
gr.query();
while (gr.next()) {
  gr.setValue('parent_incident', parentId);
  gr.setWorkflow(false);
  gr.update();
}`,
    checks: [
      includes("new GlideRecord('incident')", 'Incidents'),
      includes('cmdb_ci', 'Same CI'),
      includes('parent_incident', 'Set parent'),
      includes('setWorkflow(false)', 'setWorkflow'),
    ],
  }),
  question({
    id: 'mim-07',
    title: 'Client: communication plan mandatory',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'onChange major_incident_state: if accepted, setMandatory description true (stand-in for communication plan).',
    starter: STARTERS.client,
    solution: `function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading) {
    return;
  }
  g_form.setMandatory('description', newValue == 'accepted');
}`,
    checks: [
      includes("g_form.setMandatory('description'", 'Mandatory description'),
      includes('accepted', 'Accepted'),
    ],
  }),
  question({
    id: 'mim-08',
    title: 'Count children of a MIM',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'GlideAggregate COUNT incident where parent_incident = parentId. Log count.',
    starter: `var parentId = 'dddddddddddddddddddddddddddddddd';\n`,
    solution: `var parentId = 'dddddddddddddddddddddddddddddddd';
var ga = new GlideAggregate('incident');
ga.addQuery('parent_incident', parentId);
ga.addAggregate('COUNT');
ga.query();
if (ga.next()) {
  gs.info(ga.getAggregate('COUNT'));
}`,
    checks: [
      includes("new GlideAggregate('incident')", 'Aggregate'),
      includes('parent_incident', 'Children'),
      includes("addAggregate('COUNT')", 'COUNT'),
    ],
  }),
  question({
    id: 'mim-09',
    title: 'onSubmit: require CAB note for MIM close',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'If major_incident_state is accepted and close_notes empty and state will be 7, block. Check g_form.getValue state == 7 and close_notes.',
    starter: STARTERS.clientSubmit,
    solution: `function onSubmit() {
  if (g_form.getValue('major_incident_state') == 'accepted' && g_form.getValue('state') == '7' && !g_form.getValue('close_notes')) {
    g_form.addErrorMessage('Close notes are required to close a major incident.');
    return false;
  }
  return true;
}`,
    checks: [
      includes('major_incident_state', 'MIM state'),
      includes('close_notes', 'close_notes'),
      includes('return false', 'Block'),
    ],
  }),
  question({
    id: 'mim-10',
    title: 'GlideAjax isMajor',
    difficulty: 'intermediate',
    kind: 'script_include',
    prompt: 'MimAjax.isMajor reads sysparm_id, returns "true" if major_incident_state is accepted.',
    starter: STARTERS.glideAjax,
    solution: `var MimAjax = Class.create();
MimAjax.prototype = Object.extend(new AbstractAjaxProcessor(), {
  isMajor: function() {
    var id = this.getParameter('sysparm_id');
    var gr = new GlideRecord('incident');
    if (gr.get(id) && gr.getValue('major_incident_state') == 'accepted') {
      return 'true';
    }
    return 'false';
  },
  type: 'MimAjax'
});`,
    checks: [
      includes('isMajor', 'Method'),
      includes("getParameter('sysparm_id')", 'sysparm_id'),
      includes('accepted', 'Accepted'),
    ],
  }),
  question({
    id: 'mim-11',
    title: 'Encoded query: proposed P1',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'addEncodedQuery major_incident_state=proposed^priority=1 on incident. Log numbers.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('incident');
gr.addEncodedQuery('major_incident_state=proposed^priority=1');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('number'));
}`,
    checks: [
      includes('addEncodedQuery', 'Encoded query'),
      includes('major_incident_state=proposed', 'Proposed'),
      includes('priority=1', 'P1'),
    ],
  }),
  question({
    id: 'mim-12',
    title: 'Resolve children when MIM resolves',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'When parent MIM state changes to 6, set child incidents (parent_incident = current) to state 6 with same close_notes, setWorkflow false.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.state.changesTo('6')) {
    var child = new GlideRecord('incident');
    child.addQuery('parent_incident', current.getUniqueValue());
    child.addQuery('active', true);
    child.query();
    while (child.next()) {
      child.setValue('state', '6');
      child.setValue('close_notes', current.getValue('close_notes'));
      child.setWorkflow(false);
      child.update();
    }
  }
})(current, previous);`,
    checks: [
      includes("changesTo('6')", 'Resolved'),
      includes('parent_incident', 'Children'),
      regex(/setValue\(\s*['"]state['"]\s*,\s*['"]6['"]\s*\)/, 'Resolve children'),
      includes('setWorkflow(false)', 'setWorkflow'),
    ],
  }),
  question({
    id: 'mim-13',
    title: 'Assign Major Incident Managers group',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'On accept, set assignment_group to group named "Major Incident Managers".',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.major_incident_state.changesTo('accepted')) {
    var g = new GlideRecord('sys_user_group');
    if (g.get('name', 'Major Incident Managers')) {
      current.setValue('assignment_group', g.getUniqueValue());
    }
  }
})(current, previous);`,
    checks: [
      includes('Major Incident Managers', 'Group name'),
      includes('assignment_group', 'Assign group'),
    ],
  }),
  question({
    id: 'mim-14',
    title: 'Timeline work note',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Append work_notes "Bridge opened" to incident incId.',
    starter: `var incId = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';\n`,
    solution: `var incId = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
var gr = new GlideRecord('incident');
if (gr.get(incId)) {
  gr.work_notes = 'Bridge opened';
  gr.update();
}`,
    checks: [
      includes('Bridge opened', 'Work note text'),
      includes('work_notes', 'work_notes'),
      includes('update()', 'Update'),
    ],
  }),
  question({
    id: 'mim-15',
    title: 'Prevent cancel of accepted MIM',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'If major_incident_state is accepted and state changes to 8 (Canceled), abort unless gs.hasRole("major_incident_manager") or admin.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.getValue('major_incident_state') == 'accepted' && current.state.changesTo('8')) {
    if (!gs.hasRole('major_incident_manager') && !gs.hasRole('admin')) {
      gs.addErrorMessage('Only major incident managers can cancel an accepted MIM.');
      current.setAbortAction(true);
    }
  }
})(current, previous);`,
    checks: [
      includes('accepted', 'Accepted MIM'),
      includes("changesTo('8')", 'Canceled'),
      includes("gs.hasRole('major_incident_manager')", 'Role check'),
      includes('setAbortAction(true)', 'Abort'),
    ],
  }),
  question({
    id: 'mim-16',
    title: 'onLoad: banner for MIM',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'If major_incident_state is accepted, addInfoMessage "Major incident — follow the communication plan."',
    starter: STARTERS.clientLoad,
    solution: `function onLoad() {
  if (g_form.getValue('major_incident_state') == 'accepted') {
    g_form.addInfoMessage('Major incident — follow the communication plan.');
  }
}`,
    checks: [
      includes("g_form.getValue('major_incident_state')", 'Read MIM state'),
      includes('g_form.addInfoMessage', 'Info banner'),
      includes('communication plan', 'Message text'),
    ],
  }),
];
