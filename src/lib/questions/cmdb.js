import { question, STARTERS } from './helpers.js';
import { includes, oneOf, regex } from '../grader.js';

export const TOPIC = {
  id: 'cmdb',
  title: 'CMDB & Configuration',
  blurb: 'Configuration items, relationships, identification, and CI health used by ITSM.',
};

export const questions = [
  question({
    id: 'cmdb-01',
    title: 'Query operational servers',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Query cmdb_ci_server where operational_status is 1 (Operational). Log name.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('cmdb_ci_server');
gr.addQuery('operational_status', '1');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('name'));
}`,
    checks: [
      includes("new GlideRecord('cmdb_ci_server')", 'Server CIs'),
      includes('operational_status', 'Operational status'),
      includes("getValue('name')", 'Log name'),
    ],
  }),
  question({
    id: 'cmdb-02',
    title: 'Create an application CI',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Insert cmdb_ci_appl named "Payroll Portal", install_status 1. Log sys_id.',
    starter: STARTERS.script,
    solution: `var ci = new GlideRecord('cmdb_ci_appl');
ci.initialize();
ci.setValue('name', 'Payroll Portal');
ci.setValue('install_status', '1');
var id = ci.insert();
gs.info(id);`,
    checks: [
      includes("new GlideRecord('cmdb_ci_appl')", 'Application CI'),
      includes('Payroll Portal', 'Name'),
      includes('insert()', 'Insert'),
    ],
  }),
  question({
    id: 'cmdb-03',
    title: 'Relate app Runs on::Runs server',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Insert cmdb_rel_ci: parent = appId, child = serverId, type = the sys_id of the relationship type looked up from cmdb_rel_type where name is "Runs on::Runs". If lookup fails, still set parent and child.',
    starter: `var appId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
var serverId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
`,
    solution: `var appId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
var serverId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
var type = new GlideRecord('cmdb_rel_type');
type.get('name', 'Runs on::Runs');
var rel = new GlideRecord('cmdb_rel_ci');
rel.initialize();
rel.setValue('parent', appId);
rel.setValue('child', serverId);
rel.setValue('type', type.getUniqueValue());
rel.insert();`,
    checks: [
      includes("new GlideRecord('cmdb_rel_ci')", 'Relationship table'),
      includes("setValue('parent', appId)", 'Parent app'),
      includes("setValue('child', serverId)", 'Child server'),
      includes('Runs on::Runs', 'Relationship type name'),
    ],
  }),
  question({
    id: 'cmdb-04',
    title: 'Find CIs missing support group',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Query cmdb_ci addNullQuery support_group, addActiveQuery or operational, setLimit 50, log names.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('cmdb_ci');
gr.addNullQuery('support_group');
gr.setLimit(50);
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('name'));
}`,
    checks: [
      includes("new GlideRecord('cmdb_ci')", 'cmdb_ci'),
      includes("addNullQuery('support_group')", 'Missing support group'),
      includes('setLimit(50)', 'Limit 50'),
    ],
  }),
  question({
    id: 'cmdb-05',
    title: 'Set support group from assignment',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'If support_group is empty and assignment_group is not, copy assignment_group to support_group.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.support_group.nil() && !current.assignment_group.nil()) {
    current.setValue('support_group', current.getValue('assignment_group'));
  }
})(current, previous);`,
    checks: [
      includes('support_group', 'support_group'),
      includes('assignment_group', 'assignment_group'),
      includes('setValue', 'Copy the value'),
    ],
  }),
  question({
    id: 'cmdb-06',
    title: 'IRE identifyCI JSON',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Build a JSON string payload with items array containing className cmdb_ci_linux_server and values name "lxapp01". Call IdentificationEngine.identifyCI(payload) and gs.info the result.',
    starter: STARTERS.script,
    solution: `var payload = JSON.stringify({
  items: [
    {
      className: 'cmdb_ci_linux_server',
      values: { name: 'lxapp01' }
    }
  ]
});
var result = IdentificationEngine.identifyCI(payload);
gs.info(result);`,
    checks: [
      includes('IdentificationEngine.identifyCI', 'IRE identifyCI'),
      includes('cmdb_ci_linux_server', 'Linux server class'),
      includes('lxapp01', 'CI name'),
      includes('JSON.stringify', 'JSON payload'),
    ],
  }),
  question({
    id: 'cmdb-07',
    title: 'Count related incidents for a CI',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'GlideAggregate COUNT incident where cmdb_ci = ciId and active true. Log count.',
    starter: `var ciId = 'cccccccccccccccccccccccccccccccc';\n`,
    solution: `var ciId = 'cccccccccccccccccccccccccccccccc';
var ga = new GlideAggregate('incident');
ga.addQuery('cmdb_ci', ciId);
ga.addQuery('active', true);
ga.addAggregate('COUNT');
ga.query();
if (ga.next()) {
  gs.info(ga.getAggregate('COUNT'));
}`,
    checks: [
      includes("new GlideAggregate('incident')", 'Aggregate incidents'),
      includes('cmdb_ci', 'CI filter'),
      includes("addAggregate('COUNT')", 'COUNT'),
    ],
  }),
  question({
    id: 'cmdb-08',
    title: 'Client: serial number mandatory for hardware',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'onLoad on cmdb_ci_hardware: setMandatory serial_number true.',
    starter: STARTERS.clientLoad,
    solution: `function onLoad() {
  g_form.setMandatory('serial_number', true);
}`,
    checks: [
      includes("g_form.setMandatory('serial_number', true)", 'Mandatory serial'),
    ],
  }),
  question({
    id: 'cmdb-09',
    title: 'Retire CI and related relationships',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Set CI ciId install_status to 7 (Retired). Delete cmdb_rel_ci where parent or child is ciId using two queries or addEncodedQuery parent=ciId^ORchild=ciId then deleteMultiple.',
    starter: `var ciId = 'dddddddddddddddddddddddddddddddd';\n`,
    solution: `var ciId = 'dddddddddddddddddddddddddddddddd';
var ci = new GlideRecord('cmdb_ci');
if (ci.get(ciId)) {
  ci.setValue('install_status', '7');
  ci.update();
}
var rel = new GlideRecord('cmdb_rel_ci');
rel.addEncodedQuery('parent=' + ciId + '^ORchild=' + ciId);
rel.deleteMultiple();`,
    checks: [
      includes("setValue('install_status', '7')", 'Retire status 7'),
      includes("new GlideRecord('cmdb_rel_ci')", 'Relationships'),
      includes('deleteMultiple()', 'Delete relationships'),
      includes('^OR', 'Parent or child'),
    ],
  }),
  question({
    id: 'cmdb-10',
    title: 'Encoded query: Windows OS',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Query cmdb_ci_computer addEncodedQuery osLIKEWindows^operational_status=1. Log names.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('cmdb_ci_computer');
gr.addEncodedQuery('osLIKEWindows^operational_status=1');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('name'));
}`,
    checks: [
      includes("new GlideRecord('cmdb_ci_computer')", 'Computers'),
      includes('osLIKEWindows', 'Windows OS'),
      includes('operational_status=1', 'Operational'),
    ],
  }),
  question({
    id: 'cmdb-11',
    title: 'GlideAjax getCISupportGroup',
    difficulty: 'intermediate',
    kind: 'script_include',
    prompt: 'CMDBAjax.supportGroup reads sysparm_ci, returns support_group sys_id.',
    starter: STARTERS.glideAjax,
    solution: `var CMDBAjax = Class.create();
CMDBAjax.prototype = Object.extend(new AbstractAjaxProcessor(), {
  supportGroup: function() {
    var id = this.getParameter('sysparm_ci');
    var ci = new GlideRecord('cmdb_ci');
    if (ci.get(id)) {
      return ci.getValue('support_group');
    }
    return '';
  },
  type: 'CMDBAjax'
});`,
    checks: [
      includes('supportGroup', 'Method'),
      includes("getParameter('sysparm_ci')", 'sysparm_ci'),
      includes("getValue('support_group')", 'support_group'),
    ],
  }),
  question({
    id: 'cmdb-12',
    title: 'Event cmdb.ci.retired',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'When install_status changes to 7, queue cmdb.ci.retired with parm1 = name.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.install_status.changesTo('7')) {
    gs.eventQueue('cmdb.ci.retired', current, current.getValue('name'), '');
  }
})(current, previous);`,
    checks: [
      includes("changesTo('7')", 'Retired'),
      includes('gs.eventQueue', 'Event'),
      includes('cmdb.ci.retired', 'Event name'),
    ],
  }),
  question({
    id: 'cmdb-13',
    title: 'Duplicate name check',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'Before insert, query cmdb_ci for the same name. If found, abort with an error.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  var gr = new GlideRecord('cmdb_ci');
  gr.addQuery('name', current.getValue('name'));
  gr.setLimit(1);
  gr.query();
  if (gr.hasNext()) {
    gs.addErrorMessage('A CI with this name already exists.');
    current.setAbortAction(true);
  }
})(current, previous);`,
    checks: [
      includes("new GlideRecord('cmdb_ci')", 'Query CIs'),
      includes("addQuery('name'", 'Same name'),
      includes('setAbortAction(true)', 'Abort'),
    ],
  }),
  question({
    id: 'cmdb-14',
    title: 'Walk child CIs',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Query cmdb_rel_ci where parent is ciId. For each, load child cmdb_ci and gs.info the child name.',
    starter: `var ciId = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';\n`,
    solution: `var ciId = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
var rel = new GlideRecord('cmdb_rel_ci');
rel.addQuery('parent', ciId);
rel.query();
while (rel.next()) {
  var child = new GlideRecord('cmdb_ci');
  if (child.get(rel.getValue('child'))) {
    gs.info(child.getValue('name'));
  }
}`,
    checks: [
      includes("new GlideRecord('cmdb_rel_ci')", 'Relationships'),
      includes("addQuery('parent', ciId)", 'Children of parent'),
      includes("new GlideRecord('cmdb_ci')", 'Load child CI'),
      includes("getValue('name')", 'Log name'),
    ],
  }),
  question({
    id: 'cmdb-15',
    title: 'createOrUpdateCI',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Call IdentificationEngine.createOrUpdateCI with source "ServiceNow" and a JSON payload for cmdb_ci_win_server named "winapp01".',
    starter: STARTERS.script,
    solution: `var payload = JSON.stringify({
  items: [
    { className: 'cmdb_ci_win_server', values: { name: 'winapp01' } }
  ]
});
var result = IdentificationEngine.createOrUpdateCI('ServiceNow', payload);
gs.info(result);`,
    checks: [
      includes('IdentificationEngine.createOrUpdateCI', 'createOrUpdateCI'),
      includes('ServiceNow', 'Source'),
      includes('cmdb_ci_win_server', 'Windows server'),
      includes('winapp01', 'Name'),
    ],
  }),
  question({
    id: 'cmdb-16',
    title: 'onChange: warn if CI retired',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'onChange of cmdb_ci on incident: getReference callback; if operational_status is 6 (Retired) showFieldMsg on cmdb_ci error.',
    starter: STARTERS.client,
    solution: `function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || newValue === '') {
    return;
  }
  g_form.getReference('cmdb_ci', function(ci) {
    if (ci.operational_status == '6') {
      g_form.showFieldMsg('cmdb_ci', 'Selected CI is retired', 'error');
    }
  });
}`,
    checks: [
      includes("g_form.getReference('cmdb_ci'", 'getReference'),
      includes('operational_status', 'Status'),
      includes('showFieldMsg', 'Field message'),
    ],
  }),
];
