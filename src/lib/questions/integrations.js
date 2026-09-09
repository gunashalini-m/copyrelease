import { question, STARTERS } from './helpers.js';
import { includes, oneOf, regex, allOf } from '../grader.js';

export const TOPIC = {
  id: 'integrations',
  title: 'Integrations',
  blurb: 'Outbound REST/SOAP, Scripted REST APIs, import sets, MID Server, and JSON payloads.',
};

export const questions = [
  question({
    id: 'int-01',
    title: 'Outbound REST GET',
    difficulty: 'easy',
    kind: 'integration',
    prompt: 'Create sn_ws.RESTMessageV2, setHttpMethod GET, setEndpoint https://api.example.com/incidents, execute, log status code and body.',
    starter: STARTERS.script,
    solution: `var rm = new sn_ws.RESTMessageV2();
rm.setHttpMethod('GET');
rm.setEndpoint('https://api.example.com/incidents');
var res = rm.execute();
gs.info(res.getStatusCode());
gs.info(res.getBody());`,
    checks: [
      includes('sn_ws.RESTMessageV2', 'RESTMessageV2'),
      includes("setHttpMethod('GET')", 'GET'),
      includes('https://api.example.com/incidents', 'Endpoint'),
      includes('execute()', 'execute'),
      includes('getStatusCode()', 'Status'),
      includes('getBody()', 'Body'),
    ],
  }),
  question({
    id: 'int-02',
    title: 'Outbound REST JSON POST',
    difficulty: 'intermediate',
    kind: 'integration',
    prompt: 'POST https://api.example.com/tickets with Content-Type application/json and body JSON.stringify({ short_description: "VPN down", urgency: "1" }). Log status.',
    starter: STARTERS.script,
    solution: `var rm = new sn_ws.RESTMessageV2();
rm.setHttpMethod('POST');
rm.setEndpoint('https://api.example.com/tickets');
rm.setRequestHeader('Content-Type', 'application/json');
rm.setRequestBody(JSON.stringify({ short_description: 'VPN down', urgency: '1' }));
var res = rm.execute();
gs.info(res.getStatusCode());`,
    checks: [
      includes("setHttpMethod('POST')", 'POST'),
      includes('setRequestHeader', 'Header'),
      includes('application/json', 'JSON content type'),
      includes('setRequestBody', 'Body'),
      includes('JSON.stringify', 'JSON.stringify'),
      includes('VPN down', 'Payload'),
    ],
  }),
  question({
    id: 'int-03',
    title: 'Named REST message with parameters',
    difficulty: 'intermediate',
    kind: 'integration',
    prompt: 'new sn_ws.RESTMessageV2("PagerDuty", "postEvent"); setStringParameter("routing_key", "RKEY"); setStringParameter("summary", current.getValue("short_description")); execute and if haveError log getErrorMessage.',
    starter: STARTERS.script,
    solution: `var rm = new sn_ws.RESTMessageV2('PagerDuty', 'postEvent');
rm.setStringParameter('routing_key', 'RKEY');
rm.setStringParameter('summary', current.getValue('short_description'));
var res = rm.execute();
if (res.haveError()) {
  gs.error(res.getErrorMessage());
}`,
    checks: [
      includes("RESTMessageV2('PagerDuty', 'postEvent')", 'Named message'),
      includes("setStringParameter('routing_key'", 'routing_key'),
      includes("setStringParameter('summary'", 'summary'),
      includes('haveError()', 'Error check'),
      includes('getErrorMessage()', 'Error text'),
    ],
  }),
  question({
    id: 'int-04',
    title: 'Async REST via MID Server',
    difficulty: 'intermediate',
    kind: 'integration',
    prompt: 'RESTMessageV2 GET to http://internal.example.local/health, setMIDServer "MID_PROD", executeAsync, then waitForResponse(30) on the response.',
    starter: STARTERS.script,
    solution: `var rm = new sn_ws.RESTMessageV2();
rm.setHttpMethod('GET');
rm.setEndpoint('http://internal.example.local/health');
rm.setMIDServer('MID_PROD');
var res = rm.executeAsync();
res.waitForResponse(30);
gs.info(res.getStatusCode());`,
    checks: [
      includes("setMIDServer('MID_PROD')", 'MID Server'),
      includes('executeAsync()', 'Async'),
      includes('waitForResponse(30)', 'Wait 30s'),
      includes('internal.example.local', 'Internal endpoint'),
    ],
  }),
  question({
    id: 'int-05',
    title: 'Scripted REST: get incident by number',
    difficulty: 'intermediate',
    kind: 'integration',
    prompt: 'Scripted REST process function: read pathParams.number, GlideRecord incident get by number, if found setStatus 200 and setBody { number, short_description, state }; else setStatus 404 and setBody { error: "not_found" }.',
    starter: STARTERS.scriptedRest,
    solution: `(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
  var number = request.pathParams.number;
  var gr = new GlideRecord('incident');
  if (gr.get('number', number)) {
    response.setStatus(200);
    response.setBody({
      number: gr.getValue('number'),
      short_description: gr.getValue('short_description'),
      state: gr.getValue('state')
    });
  } else {
    response.setStatus(404);
    response.setBody({ error: 'not_found' });
  }
})(request, response);`,
    checks: [
      includes('request.pathParams', 'Path params'),
      includes("new GlideRecord('incident')", 'Load incident'),
      includes('response.setStatus(200)', '200'),
      includes('response.setStatus(404)', '404'),
      includes('not_found', 'not_found'),
      includes('setBody', 'Body'),
    ],
  }),
  question({
    id: 'int-06',
    title: 'Scripted REST: create incident',
    difficulty: 'intermediate',
    kind: 'integration',
    prompt: 'Parse request.body.data (already an object) short_description and caller_id. Insert incident. setStatus 201, setBody { sys_id, number }.',
    starter: STARTERS.scriptedRest,
    solution: `(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
  var data = request.body.data;
  var gr = new GlideRecord('incident');
  gr.initialize();
  gr.setValue('short_description', data.short_description);
  gr.setValue('caller_id', data.caller_id);
  var id = gr.insert();
  response.setStatus(201);
  response.setBody({ sys_id: id, number: gr.getValue('number') });
})(request, response);`,
    checks: [
      includes('request.body.data', 'Read JSON body'),
      includes('initialize()', 'New record'),
      includes('short_description', 'short_description'),
      includes('insert()', 'Insert'),
      includes('setStatus(201)', '201 Created'),
    ],
  }),
  question({
    id: 'int-07',
    title: 'Basic authentication on REST',
    difficulty: 'easy',
    kind: 'integration',
    prompt: 'RESTMessageV2 POST to https://api.example.com/login, setBasicAuth user "svc.itsm" password gs.getProperty("integration.password"), setRequestHeader Accept application/json.',
    starter: STARTERS.script,
    solution: `var rm = new sn_ws.RESTMessageV2();
rm.setHttpMethod('POST');
rm.setEndpoint('https://api.example.com/login');
rm.setBasicAuth('svc.itsm', gs.getProperty('integration.password'));
rm.setRequestHeader('Accept', 'application/json');
var res = rm.execute();
gs.info(res.getStatusCode());`,
    checks: [
      includes('setBasicAuth', 'Basic auth'),
      includes('svc.itsm', 'Service user'),
      includes("gs.getProperty('integration.password')", 'Password from property'),
      includes('application/json', 'Accept JSON'),
    ],
  }),
  question({
    id: 'int-08',
    title: 'Parse inbound JSON and update incident',
    difficulty: 'intermediate',
    kind: 'integration',
    prompt: 'var payload is a JSON string { "number": "INC0001111", "state": "6" }. JSON.parse it, load incident by number, set state, update.',
    starter: `var payload = '{"number":"INC0001111","state":"6"}';\n`,
    solution: `var payload = '{"number":"INC0001111","state":"6"}';
var data = JSON.parse(payload);
var gr = new GlideRecord('incident');
if (gr.get('number', data.number)) {
  gr.setValue('state', data.state);
  gr.update();
}`,
    checks: [
      includes('JSON.parse', 'Parse JSON'),
      includes("new GlideRecord('incident')", 'Incident'),
      includes('data.number', 'Use parsed number'),
      includes('data.state', 'Use parsed state'),
      includes('update()', 'Update'),
    ],
  }),
  question({
    id: 'int-09',
    title: 'SOAP message execute',
    difficulty: 'easy',
    kind: 'integration',
    prompt: 'new sn_ws.SOAPMessageV2("CMDBSync", "exportCI"); setStringParameter("ci_name", "lxapp01"); execute; log getBody.',
    starter: STARTERS.script,
    solution: `var soap = new sn_ws.SOAPMessageV2('CMDBSync', 'exportCI');
soap.setStringParameter('ci_name', 'lxapp01');
var res = soap.execute();
gs.info(res.getBody());`,
    checks: [
      includes('SOAPMessageV2', 'SOAPMessageV2'),
      includes('CMDBSync', 'Message name'),
      includes("setStringParameter('ci_name'", 'Parameter'),
      includes('execute()', 'execute'),
    ],
  }),
  question({
    id: 'int-10',
    title: 'Import set row insert',
    difficulty: 'intermediate',
    kind: 'integration',
    prompt: 'Insert into import table u_incident_import: u_number INC9990001, u_short_description "Interface error". Then you would transform; here just insert and log sys_id.',
    starter: STARTERS.script,
    solution: `var row = new GlideRecord('u_incident_import');
row.initialize();
row.setValue('u_number', 'INC9990001');
row.setValue('u_short_description', 'Interface error');
var id = row.insert();
gs.info(id);`,
    checks: [
      includes("new GlideRecord('u_incident_import')", 'Import table'),
      includes('INC9990001', 'External number'),
      includes('Interface error', 'Description'),
      includes('insert()', 'Insert row'),
    ],
  }),
  question({
    id: 'int-11',
    title: 'Transform script: ignore empty',
    difficulty: 'easy',
    kind: 'integration',
    prompt: 'In an onBefore transform script: if source.u_short_description is empty, set ignore = true.',
    starter: STARTERS.script,
    solution: `if (gs.nil(source.u_short_description)) {
  ignore = true;
}`,
    checks: [
      includes('source.u_short_description', 'Source field'),
      includes('ignore = true', 'Ignore row'),
      oneOf(['gs.nil', '!source.u_short_description'], 'Empty check'),
    ],
  }),
  question({
    id: 'int-12',
    title: 'ECC queue probe log',
    difficulty: 'intermediate',
    kind: 'integration',
    prompt: 'Query ecc_queue where agent is MID_PROD and topic is RESTProbe, orderByDesc sys_created_on, setLimit 10, log payload or name field—use getValue("queue") and getValue("state").',
    starter: STARTERS.script,
    solution: `var ecc = new GlideRecord('ecc_queue');
ecc.addQuery('agent', 'MID_PROD');
ecc.addQuery('topic', 'RESTProbe');
ecc.orderByDesc('sys_created_on');
ecc.setLimit(10);
ecc.query();
while (ecc.next()) {
  gs.info(ecc.getValue('state'));
}`,
    checks: [
      includes("new GlideRecord('ecc_queue')", 'ecc_queue'),
      includes('MID_PROD', 'Agent'),
      includes('RESTProbe', 'Topic'),
      includes('setLimit(10)', 'Limit 10'),
    ],
  }),
  question({
    id: 'int-13',
    title: 'Query parameter and header',
    difficulty: 'easy',
    kind: 'integration',
    prompt: 'REST GET https://api.example.com/search, setQueryParameter q "email outage", setRequestHeader Authorization "Bearer " + gs.getProperty("integration.token").',
    starter: STARTERS.script,
    solution: `var rm = new sn_ws.RESTMessageV2();
rm.setHttpMethod('GET');
rm.setEndpoint('https://api.example.com/search');
rm.setQueryParameter('q', 'email outage');
rm.setRequestHeader('Authorization', 'Bearer ' + gs.getProperty('integration.token'));
var res = rm.execute();
gs.info(res.getBody());`,
    checks: [
      includes('setQueryParameter', 'Query param'),
      includes('email outage', 'Search text'),
      includes('Authorization', 'Auth header'),
      includes('integration.token', 'Token property'),
    ],
  }),
  question({
    id: 'int-14',
    title: 'Scripted REST query filter',
    difficulty: 'intermediate',
    kind: 'integration',
    prompt: 'Read request.queryParams.priority (may be array—use + or String). Query incident addQuery priority that value, active true, setLimit 20. setBody an array of { number, priority }.',
    starter: STARTERS.scriptedRest,
    solution: `(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
  var priority = request.queryParams.priority;
  if (priority && priority.join) {
    priority = priority[0];
  }
  var result = [];
  var gr = new GlideRecord('incident');
  gr.addQuery('priority', priority);
  gr.addQuery('active', true);
  gr.setLimit(20);
  gr.query();
  while (gr.next()) {
    result.push({ number: gr.getValue('number'), priority: gr.getValue('priority') });
  }
  response.setStatus(200);
  response.setBody(result);
})(request, response);`,
    checks: [
      includes('request.queryParams', 'Query params'),
      includes('priority', 'Priority filter'),
      includes('setLimit(20)', 'Limit 20'),
      includes('result.push', 'Build array'),
      includes('setBody', 'Response body'),
    ],
  }),
  question({
    id: 'int-15',
    title: 'Handle non-2xx REST status',
    difficulty: 'intermediate',
    kind: 'integration',
    prompt: 'Execute a GET. If status < 200 or >= 300, gs.error the body and do not parse JSON. Else JSON.parse the body and gs.info parsed.id.',
    starter: STARTERS.script,
    solution: `var rm = new sn_ws.RESTMessageV2();
rm.setHttpMethod('GET');
rm.setEndpoint('https://api.example.com/item');
var res = rm.execute();
var status = res.getStatusCode();
var body = res.getBody();
if (status < 200 || status >= 300) {
  gs.error(body);
} else {
  var parsed = JSON.parse(body);
  gs.info(parsed.id);
}`,
    checks: [
      includes('getStatusCode()', 'Status'),
      includes('gs.error', 'Log errors'),
      includes('JSON.parse', 'Parse success JSON'),
      includes('parsed.id', 'Read id'),
    ],
  }),
  question({
    id: 'int-16',
    title: 'setStringParameterNoEscape for JSON fragments',
    difficulty: 'easy',
    kind: 'integration',
    prompt: 'Named REST message Webhook / send: setStringParameterNoEscape("payload", JSON.stringify({ number: current.getValue("number") })); execute.',
    starter: STARTERS.script,
    solution: `var rm = new sn_ws.RESTMessageV2('Webhook', 'send');
rm.setStringParameterNoEscape('payload', JSON.stringify({ number: current.getValue('number') }));
var res = rm.execute();
gs.info(res.getStatusCode());`,
    checks: [
      includes('setStringParameterNoEscape', 'NoEscape'),
      includes('JSON.stringify', 'JSON fragment'),
      includes("RESTMessageV2('Webhook', 'send')", 'Named webhook'),
    ],
  }),
  question({
    id: 'int-17',
    title: 'Inbound header API key check',
    difficulty: 'intermediate',
    kind: 'integration',
    prompt: 'In Scripted REST, if request.getHeader("X-API-Key") does not equal gs.getProperty("inbound.api.key"), setStatus 401 and setBody { error: "unauthorized" }, return. Else setStatus 204.',
    starter: STARTERS.scriptedRest,
    solution: `(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
  var key = request.getHeader('X-API-Key');
  if (key != gs.getProperty('inbound.api.key')) {
    response.setStatus(401);
    response.setBody({ error: 'unauthorized' });
    return;
  }
  response.setStatus(204);
})(request, response);`,
    checks: [
      includes("getHeader('X-API-Key')", 'API key header'),
      includes("gs.getProperty('inbound.api.key')", 'Stored key'),
      includes('setStatus(401)', '401'),
      includes('unauthorized', 'unauthorized'),
      includes('setStatus(204)', '204'),
    ],
  }),
];
