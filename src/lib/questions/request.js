import { question, STARTERS } from './helpers.js';
import { includes, regex, oneOf } from '../grader.js';

export const TOPIC = {
  id: 'request',
  title: 'Request & Catalog',
  blurb: 'Service Catalog requests, RITMs, catalog tasks, variables, and request fulfillment.',
};

export const questions = [
  question({
    id: 'req-01',
    title: 'Query open requested items',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Query sc_req_item where active is true and state is not Closed Complete (3). Log the number of each RITM.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('sc_req_item');
gr.addQuery('active', true);
gr.addQuery('state', '!=', '3');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('number'));
}`,
    checks: [
      includes("new GlideRecord('sc_req_item')", 'sc_req_item'),
      includes("addQuery('active', true)", 'Active'),
      includes("addQuery('state', '!=', '3')", 'Not closed complete'),
      includes('.next()', 'Iterate'),
    ],
  }),
  question({
    id: 'req-02',
    title: 'Create a catalog request and RITM',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Insert sc_request for the current user (requested_for). Then insert sc_req_item linked via request, cat_item sys_id itemId, short_description "Laptop request".',
    starter: `var itemId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';\n`,
    solution: `var itemId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
var req = new GlideRecord('sc_request');
req.initialize();
req.setValue('requested_for', gs.getUserID());
var reqId = req.insert();
var ritm = new GlideRecord('sc_req_item');
ritm.initialize();
ritm.setValue('request', reqId);
ritm.setValue('cat_item', itemId);
ritm.setValue('short_description', 'Laptop request');
ritm.insert();`,
    checks: [
      includes("new GlideRecord('sc_request')", 'Create request'),
      includes('gs.getUserID()', 'Current user'),
      includes("new GlideRecord('sc_req_item')", 'Create RITM'),
      includes('cat_item', 'Set cat_item'),
      includes('Laptop request', 'Description'),
      includes('insert()', 'Insert records'),
    ],
  }),
  question({
    id: 'req-03',
    title: 'Abort RITM close with open catalog tasks',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'On sc_req_item, if state changes to Closed Complete (3) and any sc_task for this request_item is still active, abort and add an error.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.state.changesTo('3')) {
    var t = new GlideRecord('sc_task');
    t.addQuery('request_item', current.getUniqueValue());
    t.addQuery('active', true);
    t.setLimit(1);
    t.query();
    if (t.hasNext()) {
      gs.addErrorMessage('Close catalog tasks before closing the requested item.');
      current.setAbortAction(true);
    }
  }
})(current, previous);`,
    checks: [
      includes("new GlideRecord('sc_task')", 'Query sc_task'),
      includes('request_item', 'Link to RITM'),
      includes('setAbortAction(true)', 'Abort'),
      includes('gs.addErrorMessage', 'Error'),
    ],
  }),
  question({
    id: 'req-04',
    title: 'Set stage to fulfillment',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'When assignment_group is set (changes and not nil), set stage to fulfillment.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.assignment_group.changes() && !current.assignment_group.nil()) {
    current.setValue('stage', 'fulfillment');
  }
})(current, previous);`,
    checks: [
      includes('assignment_group.changes()', 'Watch assignment_group'),
      includes("setValue('stage', 'fulfillment')", 'Stage fulfillment'),
    ],
  }),
  question({
    id: 'req-05',
    title: 'Create a catalog task',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Insert sc_task for RITM ritmId, short_description "Procure hardware", assignment_group looked up by name "Hardware".',
    starter: `var ritmId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';\n`,
    solution: `var ritmId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
var g = new GlideRecord('sys_user_group');
g.get('name', 'Hardware');
var t = new GlideRecord('sc_task');
t.initialize();
t.setValue('request_item', ritmId);
t.setValue('short_description', 'Procure hardware');
t.setValue('assignment_group', g.getUniqueValue());
t.insert();`,
    checks: [
      includes("new GlideRecord('sc_task')", 'sc_task'),
      includes('request_item', 'Parent RITM'),
      includes('Procure hardware', 'Description'),
      includes('Hardware', 'Hardware group'),
    ],
  }),
  question({
    id: 'req-06',
    title: 'Cart API style: set quantity variable',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Load sc_item_option_mtom is not required. Instead: GlideRecord sc_item_option where request_item = ritmId and item_option_new.name is "quantity". Set value to "2" and update. Use a join query or two-step query. Simple approach: query sc_item_option_mtom... For this lab, query sc_item_option with addQuery("request_item", ritmId) and addQuery("item_option_new.name", "quantity").',
    starter: `var ritmId = 'cccccccccccccccccccccccccccccccc';\n`,
    solution: `var ritmId = 'cccccccccccccccccccccccccccccccc';
var opt = new GlideRecord('sc_item_option');
opt.addQuery('request_item', ritmId);
opt.addQuery('item_option_new.name', 'quantity');
opt.query();
if (opt.next()) {
  opt.setValue('value', '2');
  opt.update();
}`,
    checks: [
      includes("new GlideRecord('sc_item_option')", 'Variable value table'),
      includes('quantity', 'quantity variable'),
      includes("setValue('value', '2')", 'Set quantity 2'),
      includes('update()', 'Update'),
    ],
  }),
  question({
    id: 'req-07',
    title: 'Client: hide delivery_address for pickup',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'onChange of delivery_method: if newValue is pickup, hide delivery_address; otherwise show it.',
    starter: STARTERS.client,
    solution: `function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading) {
    return;
  }
  g_form.setDisplay('delivery_address', newValue != 'pickup');
}`,
    checks: [
      includes("g_form.setDisplay('delivery_address'", 'Toggle delivery_address'),
      includes('pickup', 'Pickup method'),
    ],
  }),
  question({
    id: 'req-08',
    title: 'Close request when all RITMs close',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'For request reqId, if no active sc_req_item remain, set the sc_request state to Closed Complete (3) and update.',
    starter: `var reqId = 'dddddddddddddddddddddddddddddddd';\n`,
    solution: `var reqId = 'dddddddddddddddddddddddddddddddd';
var ritm = new GlideRecord('sc_req_item');
ritm.addQuery('request', reqId);
ritm.addQuery('active', true);
ritm.setLimit(1);
ritm.query();
if (!ritm.hasNext()) {
  var req = new GlideRecord('sc_request');
  if (req.get(reqId)) {
    req.setValue('request_state', 'closed_complete');
    req.update();
  }
}`,
    checks: [
      includes("new GlideRecord('sc_req_item')", 'Check RITMs'),
      includes("new GlideRecord('sc_request')", 'Update request'),
      oneOf(['closed_complete', "setValue('state', '3')", "setValue('request_state'"], 'Close the request'),
      includes('update()', 'Save request'),
    ],
  }),
  question({
    id: 'req-09',
    title: 'Event sc.request.opened',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'On insert of sc_request, queue sc.request.opened with parm1 = requested_for display value.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  gs.eventQueue('sc.request.opened', current, current.requested_for.getDisplayValue(), '');
})(current, previous);`,
    checks: [
      includes('gs.eventQueue', 'eventQueue'),
      includes('sc.request.opened', 'Event name'),
      includes('requested_for', 'Parm from requested_for'),
    ],
  }),
  question({
    id: 'req-10',
    title: 'Count RITMs per catalog item',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'GlideAggregate sc_req_item COUNT grouped by cat_item. Log cat_item and count.',
    starter: STARTERS.script,
    solution: `var ga = new GlideAggregate('sc_req_item');
ga.addAggregate('COUNT');
ga.groupBy('cat_item');
ga.query();
while (ga.next()) {
  gs.info(ga.getValue('cat_item') + ' ' + ga.getAggregate('COUNT'));
}`,
    checks: [
      includes("new GlideAggregate('sc_req_item')", 'Aggregate RITMs'),
      includes("groupBy('cat_item')", 'Group by cat_item'),
      includes("addAggregate('COUNT')", 'COUNT'),
      includes('getAggregate', 'Read count'),
    ],
  }),
  question({
    id: 'req-11',
    title: 'GlideAjax: getItemPrice',
    difficulty: 'intermediate',
    kind: 'script_include',
    prompt: 'CatalogAjax.getPrice reads sysparm_item, loads sc_cat_item, returns price field.',
    starter: STARTERS.glideAjax,
    solution: `var CatalogAjax = Class.create();
CatalogAjax.prototype = Object.extend(new AbstractAjaxProcessor(), {
  getPrice: function() {
    var id = this.getParameter('sysparm_item');
    var item = new GlideRecord('sc_cat_item');
    if (item.get(id)) {
      return item.getValue('price');
    }
    return '0';
  },
  type: 'CatalogAjax'
});`,
    checks: [
      includes('getPrice', 'getPrice'),
      includes("getParameter('sysparm_item')", 'sysparm_item'),
      includes("new GlideRecord('sc_cat_item')", 'Catalog item'),
      includes("getValue('price')", 'Return price'),
    ],
  }),
  question({
    id: 'req-12',
    title: 'onSubmit: quantity max 5',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'If quantity is greater than 5, showError on quantity and return false. Use parseInt.',
    starter: STARTERS.clientSubmit,
    solution: `function onSubmit() {
  var qty = parseInt(g_form.getValue('quantity'), 10);
  if (qty > 5) {
    g_form.showFieldMsg('quantity', 'Maximum quantity is 5', 'error');
    return false;
  }
  return true;
}`,
    checks: [
      includes("g_form.getValue('quantity')", 'Read quantity'),
      includes('parseInt', 'parseInt'),
      includes('return false', 'Block'),
      includes('showFieldMsg', 'Field error'),
    ],
  }),
  question({
    id: 'req-13',
    title: 'Copy RITM comments to request',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'When comments change on sc_req_item, set the parent sc_request comments to the same text (load request GlideRecord and update with setWorkflow false).',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (current.comments.changes()) {
    var req = new GlideRecord('sc_request');
    if (req.get(current.getValue('request'))) {
      req.comments = current.comments.getJournalEntry(1);
      req.setWorkflow(false);
      req.update();
    }
  }
})(current, previous);`,
    checks: [
      includes("new GlideRecord('sc_request')", 'Load request'),
      includes('comments', 'Copy comments'),
      includes('setWorkflow(false)', 'Avoid loops'),
    ],
  }),
  question({
    id: 'req-14',
    title: 'Encoded query: VIP requested_for',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Query sc_request with addEncodedQuery requested_for.vip=true^active=true. Log numbers.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('sc_request');
gr.addEncodedQuery('requested_for.vip=true^active=true');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('number'));
}`,
    checks: [
      includes("new GlideRecord('sc_request')", 'sc_request'),
      includes('addEncodedQuery', 'Encoded query'),
      includes('requested_for.vip=true', 'VIP'),
    ],
  }),
  question({
    id: 'req-15',
    title: 'Cancel leftover tasks',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'For RITM ritmId, set all active sc_task state to Closed Incomplete (4) with setWorkflow(false).',
    starter: `var ritmId = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';\n`,
    solution: `var ritmId = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
var t = new GlideRecord('sc_task');
t.addQuery('request_item', ritmId);
t.addQuery('active', true);
t.query();
while (t.next()) {
  t.setValue('state', '4');
  t.setWorkflow(false);
  t.update();
}`,
    checks: [
      includes("new GlideRecord('sc_task')", 'sc_task'),
      includes('request_item', 'RITM'),
      regex(/setValue\(\s*['"]state['"]\s*,\s*['"]4['"]\s*\)/, 'State 4'),
      includes('setWorkflow(false)', 'setWorkflow'),
    ],
  }),
  question({
    id: 'req-16',
    title: 'Set approval state',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Load sysapproval_approver by sys_id appId and set state to approved, then update.',
    starter: `var appId = 'ffffffffffffffffffffffffffffffff';\n`,
    solution: `var appId = 'ffffffffffffffffffffffffffffffff';
var app = new GlideRecord('sysapproval_approver');
if (app.get(appId)) {
  app.setValue('state', 'approved');
  app.update();
}`,
    checks: [
      includes("new GlideRecord('sysapproval_approver')", 'Approver table'),
      includes("setValue('state', 'approved')", 'Approved'),
      includes('update()', 'Update'),
    ],
  }),
];
