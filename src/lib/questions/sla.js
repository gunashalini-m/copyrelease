import { question, STARTERS } from './helpers.js';
import { includes, oneOf, regex } from '../grader.js';

export const TOPIC = {
  id: 'sla',
  title: 'SLA Management',
  blurb: 'Task SLAs, breach handling, pause conditions, and notifications.',
};

export const questions = [
  question({
    id: 'sla-01',
    title: 'Query breached task SLAs',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Query task_sla where has_breached is true and stage is in_progress. Log the task display (task.getDisplayValue) or task field.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('task_sla');
gr.addQuery('has_breached', true);
gr.addQuery('stage', 'in_progress');
gr.query();
while (gr.next()) {
  gs.info(gr.getDisplayValue('task'));
}`,
    checks: [
      includes("new GlideRecord('task_sla')", 'task_sla'),
      includes('has_breached', 'Breached'),
      includes("addQuery('stage', 'in_progress')", 'In progress'),
    ],
  }),
  question({
    id: 'sla-02',
    title: 'Count open SLAs for an incident',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'GlideAggregate COUNT task_sla where task = incId and stage != complete. Log count. Use addQuery stage != completed or stage=in_progress. Filter task = incId.',
    starter: `var incId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';\n`,
    solution: `var incId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
var ga = new GlideAggregate('task_sla');
ga.addQuery('task', incId);
ga.addQuery('stage', '!=', 'completed');
ga.addAggregate('COUNT');
ga.query();
if (ga.next()) {
  gs.info(ga.getAggregate('COUNT'));
}`,
    checks: [
      includes("new GlideAggregate('task_sla')", 'Aggregate task_sla'),
      includes("addQuery('task', incId)", 'For the incident'),
      includes("addAggregate('COUNT')", 'COUNT'),
    ],
  }),
  question({
    id: 'sla-03',
    title: 'On breach escalate assignment group',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'After update on task_sla: if has_breached changes to true, load the task incident and set escalation to 1, then update the task.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.has_breached.changesTo('true')) {
    var task = new GlideRecord('incident');
    if (task.get(current.getValue('task'))) {
      task.setValue('escalation', '1');
      task.update();
    }
  }
})(current, previous);`,
    checks: [
      includes("changesTo('true')", 'Newly breached'),
      includes('has_breached', 'has_breached'),
      includes("setValue('escalation', '1')", 'Escalate'),
      includes('update()', 'Update task'),
    ],
  }),
  question({
    id: 'sla-04',
    title: 'Queue sla.breached event',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'When has_breached changes to true, gs.eventQueue sla.breached on current with parm1 = task number display.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.has_breached.changesTo('true')) {
    gs.eventQueue('sla.breached', current, current.task.getDisplayValue(), '');
  }
})(current, previous);`,
    checks: [
      includes('gs.eventQueue', 'eventQueue'),
      includes('sla.breached', 'Event name'),
      includes('has_breached', 'Breach field'),
    ],
  }),
  question({
    id: 'sla-05',
    title: 'Pause SLA when on hold',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'This is a script snippet for a pause condition: return true if incident state is On Hold (3). Read current.state in a script that sets answer. Use answer = (current.getValue("state") == "3");',
    starter: STARTERS.script,
    solution: `answer = current.getValue('state') == '3';`,
    checks: [
      includes('answer', 'Set answer'),
      includes("getValue('state')", 'Read state'),
      regex(/==\s*['"]3['"]/, 'On Hold is 3'),
    ],
  }),
  question({
    id: 'sla-06',
    title: 'List contract SLAs for P1',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Query contract_sla (or sla) table contract_sla where duration is not empty and name contains P1. Use addQuery name CONTAINS P1. Log name.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('contract_sla');
gr.addQuery('name', 'CONTAINS', 'P1');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('name'));
}`,
    checks: [
      includes("new GlideRecord('contract_sla')", 'SLA definitions'),
      includes('P1', 'P1 SLAs'),
      includes("addQuery('name', 'CONTAINS', 'P1')", 'CONTAINS query'),
    ],
  }),
  question({
    id: 'sla-07',
    title: 'Client: warn when SLA breached',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'onLoad: if g_form.getValue("made_sla") is false, addErrorMessage that an SLA was missed.',
    starter: STARTERS.clientLoad,
    solution: `function onLoad() {
  if (g_form.getValue('made_sla') == 'false') {
    g_form.addErrorMessage('This task missed its SLA.');
  }
}`,
    checks: [
      includes("g_form.getValue('made_sla')", 'made_sla'),
      includes('g_form.addErrorMessage', 'Error message'),
    ],
  }),
  question({
    id: 'sla-08',
    title: 'Percentage used threshold',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Query task_sla where percentage >= 75 and stage is in_progress. Log task and percentage.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('task_sla');
gr.addQuery('percentage', '>=', 75);
gr.addQuery('stage', 'in_progress');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('task') + ' ' + gr.getValue('percentage'));
}`,
    checks: [
      includes("new GlideRecord('task_sla')", 'task_sla'),
      includes('percentage', 'percentage'),
      includes("'>='", 'At least 75'),
    ],
  }),
  question({
    id: 'sla-09',
    title: 'Reset business elapsed after reopen',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'On incident, when state changes from 6 (Resolved) to 2 (In Progress), log "SLA_RESTART" with gs.info. (Repair scripts would cancel task_sla; here just detect reopen.)',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.state.changesFrom('6') && current.getValue('state') == '2') {
    gs.info('SLA_RESTART');
  }
})(current, previous);`,
    checks: [
      includes("changesFrom('6')", 'Left Resolved'),
      regex(/state['"]\)\s*==\s*['"]2['"]|getValue\('state'\) == '2'/, 'Now In Progress'),
      includes('SLA_RESTART', 'Log marker'),
    ],
  }),
  question({
    id: 'sla-10',
    title: 'GlideAjax remaining time',
    difficulty: 'intermediate',
    kind: 'script_include',
    prompt: 'SlaAjax.remaining reads sysparm_task, finds first task_sla in_progress, returns planned_end_time getDisplayValue.',
    starter: STARTERS.glideAjax,
    solution: `var SlaAjax = Class.create();
SlaAjax.prototype = Object.extend(new AbstractAjaxProcessor(), {
  remaining: function() {
    var task = this.getParameter('sysparm_task');
    var sla = new GlideRecord('task_sla');
    sla.addQuery('task', task);
    sla.addQuery('stage', 'in_progress');
    sla.setLimit(1);
    sla.query();
    if (sla.next()) {
      return sla.getDisplayValue('planned_end_time');
    }
    return '';
  },
  type: 'SlaAjax'
});`,
    checks: [
      includes('remaining', 'Method'),
      includes("getParameter('sysparm_task')", 'sysparm_task'),
      includes("new GlideRecord('task_sla')", 'task_sla'),
      includes('planned_end_time', 'End time'),
    ],
  }),
  question({
    id: 'sla-11',
    title: 'onChange: hold reason mandatory',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'onChange state: if newValue is 3, setMandatory hold_reason true.',
    starter: STARTERS.client,
    solution: `function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading) {
    return;
  }
  g_form.setMandatory('hold_reason', newValue == '3');
}`,
    checks: [
      includes("g_form.setMandatory('hold_reason'", 'hold_reason'),
      regex(/newValue\s*==\s*['"]3['"]/, 'On Hold'),
    ],
  }),
  question({
    id: 'sla-12',
    title: 'Encoded query: breached today',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'task_sla addEncodedQuery has_breached=true^breached_onONToday. Log sys_id.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('task_sla');
gr.addEncodedQuery('has_breached=true^breached_onONToday');
gr.query();
while (gr.next()) {
  gs.info(gr.getUniqueValue());
}`,
    checks: [
      includes('addEncodedQuery', 'Encoded query'),
      includes('has_breached=true', 'Breached'),
      includes('breached_onONToday', 'Today'),
    ],
  }),
  question({
    id: 'sla-13',
    title: 'Stop SLAs on cancel',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'For task incId, query task_sla stage in_progress, set stage to cancelled and update each (setWorkflow false).',
    starter: `var incId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';\n`,
    solution: `var incId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
var sla = new GlideRecord('task_sla');
sla.addQuery('task', incId);
sla.addQuery('stage', 'in_progress');
sla.query();
while (sla.next()) {
  sla.setValue('stage', 'cancelled');
  sla.setWorkflow(false);
  sla.update();
}`,
    checks: [
      includes("new GlideRecord('task_sla')", 'task_sla'),
      includes("setValue('stage', 'cancelled')", 'Cancelled'),
      includes('setWorkflow(false)', 'setWorkflow'),
    ],
  }),
  question({
    id: 'sla-14',
    title: 'Duration display with GlideDuration',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Create GlideDuration from business_percentage is wrong. Instead: var d = new GlideDuration(current.duration); gs.info(d.getDayPart()); Assume you have ms in variable ms. Log getDurationValue().',
    starter: `var ms = 3600000;\n`,
    solution: `var ms = 3600000;
var d = new GlideDuration(ms);
gs.info(d.getDurationValue());`,
    checks: [
      includes('new GlideDuration', 'GlideDuration'),
      includes('getDurationValue()', 'Display duration'),
    ],
  }),
  question({
    id: 'sla-15',
    title: 'Made SLA flag',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'When incident state changes to 6 or 7, if any related task_sla has_breached true, set made_sla to false else true.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.state.changesTo('6') || current.state.changesTo('7')) {
    var sla = new GlideRecord('task_sla');
    sla.addQuery('task', current.getUniqueValue());
    sla.addQuery('has_breached', true);
    sla.setLimit(1);
    sla.query();
    current.setValue('made_sla', sla.hasNext() ? false : true);
  }
})(current, previous);`,
    checks: [
      includes("new GlideRecord('task_sla')", 'task_sla'),
      includes('has_breached', 'Breach check'),
      includes('made_sla', 'Set made_sla'),
    ],
  }),
  question({
    id: 'sla-16',
    title: 'Schedule window using GlideDateTime',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'If now is after a breach GlideDateTime stored in breachAt (string UTC), gs.info("BREACHED") else gs.info("OK"). Use compareTo.',
    starter: `var breachAt = '2026-01-01 00:00:00';\n`,
    solution: `var breachAt = '2026-01-01 00:00:00';
var now = new GlideDateTime();
var due = new GlideDateTime(breachAt);
if (now.compareTo(due) > 0) {
  gs.info('BREACHED');
} else {
  gs.info('OK');
}`,
    checks: [
      includes('GlideDateTime', 'GlideDateTime'),
      includes('compareTo', 'compareTo'),
      includes('BREACHED', 'BREACHED'),
      includes('OK', 'OK'),
    ],
  }),
];
