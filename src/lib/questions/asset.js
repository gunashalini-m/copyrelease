import { question, STARTERS } from './helpers.js';
import { includes, regex, oneOf } from '../grader.js';

export const TOPIC = {
  id: 'asset',
  title: 'Asset Management',
  blurb: 'Hardware and software assets, stock, assignment, and lifecycle in ITSM.',
};

export const questions = [
  question({
    id: 'ast-01',
    title: 'Query in-stock hardware',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Query alm_hardware where install_status is 6 (In stock). Log asset_tag.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('alm_hardware');
gr.addQuery('install_status', '6');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('asset_tag'));
}`,
    checks: [
      includes("new GlideRecord('alm_hardware')", 'Hardware assets'),
      includes("addQuery('install_status', '6')", 'In stock'),
      includes('asset_tag', 'Log asset tag'),
    ],
  }),
  question({
    id: 'ast-02',
    title: 'Create a hardware asset',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Insert alm_hardware with display_name "Laptop", asset_tag "AST-1001", serial_number "SN9", install_status 1 (In use).',
    starter: STARTERS.script,
    solution: `var ast = new GlideRecord('alm_hardware');
ast.initialize();
ast.setValue('display_name', 'Laptop');
ast.setValue('asset_tag', 'AST-1001');
ast.setValue('serial_number', 'SN9');
ast.setValue('install_status', '1');
ast.insert();`,
    checks: [
      includes("new GlideRecord('alm_hardware')", 'alm_hardware'),
      includes('AST-1001', 'Asset tag'),
      includes('SN9', 'Serial'),
      includes('insert()', 'Insert'),
    ],
  }),
  question({
    id: 'ast-03',
    title: 'Assign asset to a user',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Load alm_asset by asset_tag AST-1001, set assigned_to to user sys_id userId, install_status 1, update.',
    starter: `var userId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';\n`,
    solution: `var userId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
var ast = new GlideRecord('alm_asset');
if (ast.get('asset_tag', 'AST-1001')) {
  ast.setValue('assigned_to', userId);
  ast.setValue('install_status', '1');
  ast.update();
}`,
    checks: [
      includes("new GlideRecord('alm_asset')", 'alm_asset'),
      includes('AST-1001', 'Lookup tag'),
      includes('assigned_to', 'Assign user'),
      includes('update()', 'Update'),
    ],
  }),
  question({
    id: 'ast-04',
    title: 'Abort retire without substatus',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'If install_status changes to 7 (Retired) and substatus is empty, abort with an error.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.install_status.changesTo('7') && current.substatus.nil()) {
    gs.addErrorMessage('Select a retire substatus.');
    current.setAbortAction(true);
  }
})(current, previous);`,
    checks: [
      includes("changesTo('7')", 'Retired'),
      oneOf(['substatus.nil()', "getValue('substatus')"], 'Substatus'),
      includes('setAbortAction(true)', 'Abort'),
    ],
  }),
  question({
    id: 'ast-05',
    title: 'Sync CI from asset',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'When assigned_to changes, if ci is not empty, load cmdb_ci and set assigned_to to the same user, then update the CI with setWorkflow(false).',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.assigned_to.changes() && !current.ci.nil()) {
    var ci = new GlideRecord('cmdb_ci');
    if (ci.get(current.getValue('ci'))) {
      ci.setValue('assigned_to', current.getValue('assigned_to'));
      ci.setWorkflow(false);
      ci.update();
    }
  }
})(current, previous);`,
    checks: [
      includes('assigned_to.changes()', 'Watch assigned_to'),
      includes("new GlideRecord('cmdb_ci')", 'Update CI'),
      includes('setWorkflow(false)', 'Avoid loops'),
    ],
  }),
  question({
    id: 'ast-06',
    title: 'Count assets by model',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'GlideAggregate COUNT alm_asset groupBy model. Log model and count.',
    starter: STARTERS.script,
    solution: `var ga = new GlideAggregate('alm_asset');
ga.addAggregate('COUNT');
ga.groupBy('model');
ga.query();
while (ga.next()) {
  gs.info(ga.getValue('model') + ' ' + ga.getAggregate('COUNT'));
}`,
    checks: [
      includes("new GlideAggregate('alm_asset')", 'Aggregate assets'),
      includes("groupBy('model')", 'By model'),
      includes("addAggregate('COUNT')", 'COUNT'),
    ],
  }),
  question({
    id: 'ast-07',
    title: 'Client: cost mandatory when in use',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'onChange install_status: if newValue is 1, setMandatory cost true else false.',
    starter: STARTERS.client,
    solution: `function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading) {
    return;
  }
  g_form.setMandatory('cost', newValue == '1');
}`,
    checks: [
      includes("g_form.setMandatory('cost'", 'Mandatory cost'),
      oneOf(["newValue == '1'", 'newValue === \'1\''], 'In use'),
    ],
  }),
  question({
    id: 'ast-08',
    title: 'Find duplicate serial numbers',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'GlideAggregate alm_hardware COUNT groupBy serial_number, addAggregate COUNT, then you cannot easily HAVING in SN—after query, if parseInt(getAggregate COUNT) > 1 log the serial_number. Skip empty serials with addNotNullQuery.',
    starter: STARTERS.script,
    solution: `var ga = new GlideAggregate('alm_hardware');
ga.addNotNullQuery('serial_number');
ga.addAggregate('COUNT');
ga.groupBy('serial_number');
ga.query();
while (ga.next()) {
  if (parseInt(ga.getAggregate('COUNT'), 10) > 1) {
    gs.info(ga.getValue('serial_number'));
  }
}`,
    checks: [
      includes("new GlideAggregate('alm_hardware')", 'Hardware aggregate'),
      includes("groupBy('serial_number')", 'Group serial'),
      includes("addNotNullQuery('serial_number')", 'Skip empty'),
      includes('parseInt', 'Compare count'),
    ],
  }),
  question({
    id: 'ast-09',
    title: 'Event asset.assigned',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'When assigned_to changes to a non-empty value, queue asset.assigned with parm1 = asset_tag.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.assigned_to.changes() && !current.assigned_to.nil()) {
    gs.eventQueue('asset.assigned', current, current.getValue('asset_tag'), '');
  }
})(current, previous);`,
    checks: [
      includes('gs.eventQueue', 'eventQueue'),
      includes('asset.assigned', 'Event name'),
      includes('asset_tag', 'Parm asset_tag'),
    ],
  }),
  question({
    id: 'ast-10',
    title: 'GlideAjax getAssetUser',
    difficulty: 'intermediate',
    kind: 'script_include',
    prompt: 'AssetAjax.assignedUser reads sysparm_tag, get alm_asset by asset_tag, return assigned_to.',
    starter: STARTERS.glideAjax,
    solution: `var AssetAjax = Class.create();
AssetAjax.prototype = Object.extend(new AbstractAjaxProcessor(), {
  assignedUser: function() {
    var tag = this.getParameter('sysparm_tag');
    var ast = new GlideRecord('alm_asset');
    if (ast.get('asset_tag', tag)) {
      return ast.getValue('assigned_to');
    }
    return '';
  },
  type: 'AssetAjax'
});`,
    checks: [
      includes('assignedUser', 'Method'),
      includes("getParameter('sysparm_tag')", 'sysparm_tag'),
      includes("get('asset_tag'", 'Lookup tag'),
      includes('assigned_to', 'Return assigned_to'),
    ],
  }),
  question({
    id: 'ast-11',
    title: 'Return to stock',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'For asset astId, clear assigned_to, set install_status to 6 (In stock), update.',
    starter: `var astId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';\n`,
    solution: `var astId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
var ast = new GlideRecord('alm_asset');
if (ast.get(astId)) {
  ast.setValue('assigned_to', '');
  ast.setValue('install_status', '6');
  ast.update();
}`,
    checks: [
      includes('assigned_to', 'Clear assigned_to'),
      regex(/install_status['"]\s*,\s*['"]6['"]/, 'In stock'),
      includes('update()', 'Update'),
    ],
  }),
  question({
    id: 'ast-12',
    title: 'onSubmit: require stockroom when in stock',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'If install_status is 6 and stockroom is empty, addErrorMessage and return false.',
    starter: STARTERS.clientSubmit,
    solution: `function onSubmit() {
  if (g_form.getValue('install_status') == '6' && !g_form.getValue('stockroom')) {
    g_form.addErrorMessage('Stockroom is required for in-stock assets.');
    return false;
  }
  return true;
}`,
    checks: [
      includes('install_status', 'Status'),
      includes('stockroom', 'Stockroom'),
      includes('return false', 'Block'),
    ],
  }),
  question({
    id: 'ast-13',
    title: 'Encoded query: warranty expired',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Query alm_hardware addEncodedQuery warranty_expiration<javascript:gs.now()^install_status=1. Log asset_tag.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('alm_hardware');
gr.addEncodedQuery('warranty_expiration<javascript:gs.now()^install_status=1');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('asset_tag'));
}`,
    checks: [
      includes('addEncodedQuery', 'Encoded query'),
      includes('warranty_expiration', 'Warranty'),
      includes('install_status=1', 'In use'),
    ],
  }),
  question({
    id: 'ast-14',
    title: 'Link asset to incident CI',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Load incident incId; if cmdb_ci is set, query alm_asset where ci equals that value and gs.info asset_tag of each.',
    starter: `var incId = 'cccccccccccccccccccccccccccccccc';\n`,
    solution: `var incId = 'cccccccccccccccccccccccccccccccc';
var inc = new GlideRecord('incident');
if (inc.get(incId) && inc.getValue('cmdb_ci')) {
  var ast = new GlideRecord('alm_asset');
  ast.addQuery('ci', inc.getValue('cmdb_ci'));
  ast.query();
  while (ast.next()) {
    gs.info(ast.getValue('asset_tag'));
  }
}`,
    checks: [
      includes("new GlideRecord('incident')", 'Incident'),
      includes("new GlideRecord('alm_asset')", 'Assets'),
      includes("addQuery('ci'", 'Match CI'),
    ],
  }),
  question({
    id: 'ast-15',
    title: 'Bulk retire by model',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Query alm_asset where model is modelId, set install_status 7, updateMultiple (also set substatus disposed if the field exists—set substatus to disposed before updateMultiple).',
    starter: `var modelId = 'dddddddddddddddddddddddddddddddd';\n`,
    solution: `var modelId = 'dddddddddddddddddddddddddddddddd';
var ast = new GlideRecord('alm_asset');
ast.addQuery('model', modelId);
ast.setValue('install_status', '7');
ast.setValue('substatus', 'disposed');
ast.updateMultiple();`,
    checks: [
      includes("addQuery('model', modelId)", 'Filter model'),
      includes("setValue('install_status', '7')", 'Retire'),
      includes('updateMultiple()', 'Bulk update'),
      includes('disposed', 'Substatus'),
    ],
  }),
  question({
    id: 'ast-16',
    title: 'Prevent delete of in-use asset',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'Before delete, if install_status is 1, abort with an error.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.getValue('install_status') == '1') {
    gs.addErrorMessage('Return the asset to stock before deleting.');
    current.setAbortAction(true);
  }
})(current, previous);`,
    checks: [
      includes('install_status', 'Check status'),
      includes('setAbortAction(true)', 'Abort'),
      includes('gs.addErrorMessage', 'Error'),
    ],
  }),
];
