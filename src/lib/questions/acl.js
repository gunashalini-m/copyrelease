import { question, STARTERS } from './helpers.js';
import { includes, oneOf, regex } from '../grader.js';

export const TOPIC = {
  id: 'acl',
  title: 'ACLs & Security',
  blurb: 'Record/field ACLs, GlideRecordSecure, roles, and server-side enforcement — not UI hiding.',
};

export const questions = [
  question({
    id: 'acl-01',
    title: 'GlideRecordSecure instead of GlideRecord',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'Query incident as the current user with ACL enforcement: GlideRecordSecure, active=true, log numbers you can actually read.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecordSecure('incident');
gr.addQuery('active', true);
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('number'));
}`,
    checks: [
      includes("new GlideRecordSecure('incident')", 'Use GlideRecordSecure on incident'),
      includes('addQuery', 'Filter'),
      includes('query()', 'query()'),
      includes('.next()', 'Iterate'),
    ],
  }),
  question({
    id: 'acl-02',
    title: 'canRead before returning a record',
    difficulty: 'intermediate',
    kind: 'script_include',
    prompt: 'Script Include method getIncident: load incident by sysparm_sys_id with GlideRecord. If !gr.canRead() return ""; else return number.',
    starter: STARTERS.glideAjax,
    solution: `var IncidentSecureAjax = Class.create();
IncidentSecureAjax.prototype = Object.extend(new AbstractAjaxProcessor(), {
  getIncident: function() {
    var id = this.getParameter('sysparm_sys_id');
    var gr = new GlideRecord('incident');
    if (gr.get(id) && gr.canRead()) {
      return gr.getValue('number');
    }
    return '';
  },
  type: 'IncidentSecureAjax'
});`,
    checks: [
      includes("getParameter('sysparm_sys_id')", 'Read sysparm'),
      includes("new GlideRecord('incident')", 'Load incident'),
      includes('.canRead()', 'Check canRead'),
    ],
  }),
  question({
    id: 'acl-03',
    title: 'Abort update without write',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'Before update: if the user cannot write the record (current.canWrite() is false), add an error and setAbortAction(true).',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (!current.canWrite()) {
    gs.addErrorMessage('You cannot update this record.');
    current.setAbortAction(true);
  }
})(current, previous);`,
    checks: [
      includes('canWrite()', 'canWrite'),
      includes('setAbortAction(true)', 'Abort'),
      includes('gs.addErrorMessage', 'Error'),
    ],
  }),
  question({
    id: 'acl-04',
    title: 'Role check itil',
    difficulty: 'easy',
    kind: 'business_rule',
    prompt: 'If the user does not have role itil (gs.hasRole("itil") is false) and also does not have admin, abort the action.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (!gs.hasRole('itil') && !gs.hasRole('admin')) {
    gs.addErrorMessage('itil role required.');
    current.setAbortAction(true);
  }
})(current, previous);`,
    checks: [
      includes("gs.hasRole('itil')", 'Check itil'),
      includes("gs.hasRole('admin')", 'Check admin'),
      includes('setAbortAction(true)', 'Abort'),
    ],
  }),
  question({
    id: 'acl-05',
    title: 'ACL script: only opener or assigned',
    difficulty: 'hard',
    kind: 'server',
    prompt: 'Write an ACL script body (not a full BR wrapper) that sets answer true only if opened_by or assigned_to equals gs.getUserID(). Use current and answer.',
    starter: STARTERS.script,
    solution: `answer = current.getValue('opened_by') == gs.getUserID() || current.getValue('assigned_to') == gs.getUserID();`,
    checks: [
      includes('answer', 'Set answer'),
      includes('gs.getUserID()', 'Current user'),
      includes('opened_by', 'opened_by'),
      includes('assigned_to', 'assigned_to'),
    ],
  }),
  question({
    id: 'acl-06',
    title: 'Create ACL: new records',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'ACL create script: answer is true if gs.hasRole("itil") OR current.isNewRecord() is not required — for create, check gs.hasRole("itil"). Set answer accordingly.',
    starter: STARTERS.script,
    solution: `answer = gs.hasRole('itil');`,
    checks: [
      includes('answer', 'answer'),
      includes("gs.hasRole('itil')", 'itil'),
    ],
  }),
  question({
    id: 'acl-07',
    title: 'canCreate / canDelete',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Log "CREATE" if a GlideRecord on incident canCreate(), else "NO_CREATE". Then if canDelete() log "DELETE" else "NO_DELETE". Use one GlideRecord instance.',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecord('incident');
gs.info(gr.canCreate() ? 'CREATE' : 'NO_CREATE');
gs.info(gr.canDelete() ? 'DELETE' : 'NO_DELETE');`,
    checks: [
      includes('canCreate()', 'canCreate'),
      includes('canDelete()', 'canDelete'),
      includes('CREATE', 'CREATE'),
      includes('NO_CREATE', 'NO_CREATE'),
    ],
  }),
  question({
    id: 'acl-08',
    title: 'Field-level: hide SSN pattern',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'Display-style idea in a Before query is wrong. Instead: if !gs.hasRole("admin") && current.isValidField("u_ssn"), set u_ssn to empty string so non-admins do not keep a value on update. (Simple field protection sketch.)',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (!gs.hasRole('admin') && current.isValidField('u_ssn')) {
    current.setValue('u_ssn', '');
  }
})(current, previous);`,
    checks: [
      includes("gs.hasRole('admin')", 'admin check'),
      includes('u_ssn', 'u_ssn field'),
      includes('setValue', 'Clear or set field'),
    ],
  }),
  question({
    id: 'acl-09',
    title: 'Scripted REST + GlideRecordSecure',
    difficulty: 'hard',
    kind: 'integration',
    prompt: 'Scripted REST: pathParams.sys_id, GlideRecordSecure incident get. If not found or not readable, setStatus 404. Else 200 and setBody { number }.',
    starter: STARTERS.scriptedRest,
    solution: `(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
  var id = request.pathParams.sys_id;
  var gr = new GlideRecordSecure('incident');
  if (!gr.get(id)) {
    response.setStatus(404);
    response.setBody({ error: 'not_found' });
    return;
  }
  response.setStatus(200);
  response.setBody({ number: gr.getValue('number') });
})(request, response);`,
    checks: [
      includes('GlideRecordSecure', 'GlideRecordSecure'),
      includes('pathParams', 'pathParams'),
      includes('setStatus(404)', '404'),
      includes('setStatus(200)', '200'),
    ],
  }),
  question({
    id: 'acl-10',
    title: 'isMemberOf group',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'Abort unless gs.getUser().isMemberOf("Service Desk") or gs.hasRole("admin").',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (!gs.getUser().isMemberOf('Service Desk') && !gs.hasRole('admin')) {
    gs.addErrorMessage('Service Desk members only.');
    current.setAbortAction(true);
  }
})(current, previous);`,
    checks: [
      includes('gs.getUser()', 'getUser'),
      includes("isMemberOf('Service Desk')", 'isMemberOf'),
      includes('setAbortAction(true)', 'Abort'),
    ],
  }),
  question({
    id: 'acl-11',
    title: 'hasRoleExactly',
    difficulty: 'hard',
    kind: 'client',
    prompt: 'onLoad: if the user does NOT have sn_incident_write exactly (g_user.hasRoleExactly), setReadOnly short_description true. Do not use hasRole (admin would bypass).',
    starter: STARTERS.clientLoad,
    solution: `function onLoad() {
  if (!g_user.hasRoleExactly('sn_incident_write')) {
    g_form.setReadOnly('short_description', true);
  }
}`,
    checks: [
      includes('g_user.hasRoleExactly', 'hasRoleExactly'),
      includes('sn_incident_write', 'role name'),
      includes("g_form.setReadOnly('short_description', true)", 'Read-only'),
    ],
  }),
  question({
    id: 'acl-12',
    title: 'Query ACL style: restrict encoded query',
    difficulty: 'intermediate',
    kind: 'business_rule',
    prompt: 'Query BR sketch: if !gs.hasRole("itil"), addQuery("caller_id", gs.getUserID()) so users only see their incidents.',
    starter: STARTERS.businessRule,
    solution: `(function executeRule(current, previous /*null when async*/) {
  if (!gs.hasRole('itil')) {
    current.addQuery('caller_id', gs.getUserID());
  }
})(current, previous);`,
    checks: [
      includes("gs.hasRole('itil')", 'itil'),
      includes('addQuery', 'addQuery'),
      includes('caller_id', 'caller_id'),
      includes('gs.getUserID()', 'current user'),
    ],
  }),
  question({
    id: 'acl-13',
    title: 'Deny script: answer false',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Write an ACL script that always denies: answer = false;',
    starter: STARTERS.script,
    solution: `answer = false;`,
    checks: [
      regex(/answer\s*=\s*false/, 'answer = false'),
    ],
  }),
  question({
    id: 'acl-14',
    title: 'Table name check in ACL',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'ACL script: answer true only if current.getTableName() == "incident" and gs.hasRole("itil").',
    starter: STARTERS.script,
    solution: `answer = current.getTableName() == 'incident' && gs.hasRole('itil');`,
    checks: [
      includes('getTableName()', 'getTableName'),
      includes('incident', 'incident'),
      includes("gs.hasRole('itil')", 'itil'),
      includes('answer', 'answer'),
    ],
  }),
  question({
    id: 'acl-15',
    title: 'Debug log without leaking',
    difficulty: 'easy',
    kind: 'server',
    prompt: 'Log whether the current user has role admin using gs.hasRole("admin") via gs.info, do not log the user password or session token. Log true/false only.',
    starter: STARTERS.script,
    solution: `gs.info(gs.hasRole('admin'));`,
    checks: [
      includes("gs.hasRole('admin')", 'hasRole admin'),
      includes('gs.info', 'gs.info'),
    ],
  }),
  question({
    id: 'acl-16',
    title: 'canRead on GlideRecordSecure loop',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'GlideRecordSecure problem query active true. While next, if canRead() gs.info number. (Secure may skip unreadable rows; still check canRead.)',
    starter: STARTERS.script,
    solution: `var gr = new GlideRecordSecure('problem');
gr.addQuery('active', true);
gr.query();
while (gr.next()) {
  if (gr.canRead()) {
    gs.info(gr.getValue('number'));
  }
}`,
    checks: [
      includes('GlideRecordSecure', 'Secure'),
      includes("new GlideRecordSecure('problem')", 'problem'),
      includes('canRead()', 'canRead'),
    ],
  }),
  question({
    id: 'acl-17',
    title: 'Client: do not use hasRole for security',
    difficulty: 'easy',
    kind: 'client',
    prompt: 'onSubmit: if short_description is empty, return false. Do not implement security with g_user.hasRole here — only UX validation.',
    starter: STARTERS.clientSubmit,
    solution: `function onSubmit() {
  if (!g_form.getValue('short_description')) {
    g_form.addErrorMessage('Short description is required.');
    return false;
  }
  return true;
}`,
    checks: [
      includes("g_form.getValue('short_description')", 'Read field'),
      includes('return false', 'Block submit'),
    ],
  }),
  question({
    id: 'acl-18',
    title: 'Opened by self-read',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'answer = (current.opened_by == gs.getUserID()); for a record ACL read script. Use getValue for opened_by.',
    starter: STARTERS.script,
    solution: `answer = current.getValue('opened_by') == gs.getUserID();`,
    checks: [
      includes("getValue('opened_by')", 'opened_by'),
      includes('gs.getUserID()', 'user'),
      includes('answer', 'answer'),
    ],
  }),
  question({
    id: 'acl-19',
    title: 'REST 403 when cannot read',
    difficulty: 'hard',
    kind: 'integration',
    prompt: 'Load incident with GlideRecord get pathParams.id. If found but !canRead(), setStatus 403 and body {error:"forbidden"}. If missing, 404. Else 200 {number}.',
    starter: STARTERS.scriptedRest,
    solution: `(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
  var gr = new GlideRecord('incident');
  if (!gr.get(request.pathParams.id)) {
    response.setStatus(404);
    response.setBody({ error: 'not_found' });
    return;
  }
  if (!gr.canRead()) {
    response.setStatus(403);
    response.setBody({ error: 'forbidden' });
    return;
  }
  response.setStatus(200);
  response.setBody({ number: gr.getValue('number') });
})(request, response);`,
    checks: [
      includes('canRead()', 'canRead'),
      includes('setStatus(403)', '403'),
      includes('forbidden', 'forbidden'),
      includes('setStatus(404)', '404'),
    ],
  }),
  question({
    id: 'acl-20',
    title: 'Both role and group',
    difficulty: 'intermediate',
    kind: 'server',
    prompt: 'answer true only if gs.hasRole("itil") AND gs.getUser().isMemberOf("CAB Approvers").',
    starter: STARTERS.script,
    solution: `answer = gs.hasRole('itil') && gs.getUser().isMemberOf('CAB Approvers');`,
    checks: [
      includes("gs.hasRole('itil')", 'itil'),
      includes("isMemberOf('CAB Approvers')", 'CAB Approvers'),
      includes('answer', 'answer'),
    ],
  }),
];
