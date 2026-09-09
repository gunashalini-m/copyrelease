const method = (name, signature, documentation, insertText) => ({
  name,
  signature,
  documentation,
  insertText: insertText || `${name}($0)`,
});

export const SNOW_GLOBALS = [
  {
    name: 'gs',
    kind: 'variable',
    detail: 'GlideSystem',
    documentation: 'Server-side GlideSystem: logging, user, date, properties, events, and messages.',
  },
  {
    name: 'current',
    kind: 'variable',
    detail: 'GlideRecord',
    documentation: 'The current record in a Business Rule, workflow, or UI Action.',
  },
  {
    name: 'previous',
    kind: 'variable',
    detail: 'GlideRecord',
    documentation: 'The previous values of the current record (Business Rules). Null when async.',
  },
  {
    name: 'g_form',
    kind: 'variable',
    detail: 'GlideForm',
    documentation: 'Client-side form API for fields, values, UI policy-like behavior, and messages.',
  },
  {
    name: 'g_user',
    kind: 'variable',
    detail: 'GlideUser',
    documentation: 'Client-side user: userID, userName, roles, and hasRole().',
  },
  {
    name: 'g_scratchpad',
    kind: 'variable',
    detail: 'Object',
    documentation: 'Display Business Rule scratchpad shared with client scripts.',
  },
  {
    name: 'g_list',
    kind: 'variable',
    detail: 'GlideList2',
    documentation: 'Client-side list API available in list UI scripts.',
  },
  {
    name: 'answer',
    kind: 'variable',
    detail: 'Any',
    documentation: 'Return value for reference qualifiers, default values, and calculation scripts.',
  },
  {
    name: 'template',
    kind: 'variable',
    detail: 'TemplatePrinter',
    documentation: 'Mail and notification script printer. Use template.print().',
  },
  {
    name: 'workflow',
    kind: 'variable',
    detail: 'Workflow',
    documentation: 'Workflow scratchpad and inputs in workflow scripts.',
  },
  {
    name: 'activity',
    kind: 'variable',
    detail: 'Object',
    documentation: 'Current workflow activity context.',
  },
  {
    name: 'parent',
    kind: 'variable',
    detail: 'GlideRecord',
    documentation: 'Parent record in related lists or nested forms.',
  },
  {
    name: 'request',
    kind: 'variable',
    detail: 'RESTAPIRequest',
    documentation: 'Inbound Scripted REST request (query, pathParams, body, headers).',
  },
  {
    name: 'response',
    kind: 'variable',
    detail: 'RESTAPIResponse',
    documentation: 'Inbound Scripted REST response (setBody, setStatus, setHeader).',
  },
];

export const SNOW_CLASSES = {
  GlideRecord: {
    detail: 'Server record API',
    documentation: 'Query, insert, update, and delete records on a table.',
    construct: 'new GlideRecord(${1:tableName})',
    methods: [
      method('addQuery', 'addQuery(field, [operator], value)', 'Add a query condition.', "addQuery('${1:field}', '${2:value}')"),
      method('addEncodedQuery', 'addEncodedQuery(query)', 'Add an encoded query string.', "addEncodedQuery('${1:active=true}')"),
      method('addActiveQuery', 'addActiveQuery()', 'Limit to active=true records.', 'addActiveQuery()'),
      method('addNullQuery', 'addNullQuery(field)', 'Field is empty.', "addNullQuery('${1:field}')"),
      method('addNotNullQuery', 'addNotNullQuery(field)', 'Field is not empty.', "addNotNullQuery('${1:field}')"),
      method('addJoinQuery', 'addJoinQuery(table, [primaryField], [joinField])', 'Join another table.', "addJoinQuery('${1:table}')"),
      method('addOrCondition', 'addOrCondition(field, [operator], value)', 'OR condition on the last query.', "addOrCondition('${1:field}', '${2:value}')"),
      method('canCreate', 'canCreate()', 'True if the user can insert.', 'canCreate()'),
      method('canRead', 'canRead()', 'True if the user can read.', 'canRead()'),
      method('canWrite', 'canWrite()', 'True if the user can update.', 'canWrite()'),
      method('canDelete', 'canDelete()', 'True if the user can delete.', 'canDelete()'),
      method('chooseWindow', 'chooseWindow(first, last, [forceCount])', 'Window/paginate rows.', 'chooseWindow(${1:0}, ${2:100})'),
      method('deleteMultiple', 'deleteMultiple()', 'Delete all records in the query.', 'deleteMultiple()'),
      method('deleteRecord', 'deleteRecord()', 'Delete the current record.', 'deleteRecord()'),
      method('get', 'get(sysIdOrField, [value])', 'Fetch a single record.', "get('${1:sys_id}')"),
      method('getDisplayValue', 'getDisplayValue([field])', 'Display value of a field or the record.', "getDisplayValue('${1:field}')"),
      method('getElement', 'getElement(field)', 'GlideElement for a field.', "getElement('${1:field}')"),
      method('getEncodedQuery', 'getEncodedQuery()', 'Current encoded query.', 'getEncodedQuery()'),
      method('getLastErrorMessage', 'getLastErrorMessage()', 'Last error from an update.', 'getLastErrorMessage()'),
      method('getLink', 'getLink([noStack])', 'URL to the current record.', 'getLink()'),
      method('getRowCount', 'getRowCount()', 'Rows returned by the last query.', 'getRowCount()'),
      method('getTableName', 'getTableName()', 'Table name of this GlideRecord.', 'getTableName()'),
      method('getUniqueValue', 'getUniqueValue()', 'sys_id of the current row.', 'getUniqueValue()'),
      method('getValue', 'getValue(field)', 'String value of a field.', "getValue('${1:field}')"),
      method('hasNext', 'hasNext()', 'True if another row is available.', 'hasNext()'),
      method('initialize', 'initialize()', 'Prepare a new record for insert.', 'initialize()'),
      method('insert', 'insert()', 'Insert and return the new sys_id.', 'insert()'),
      method('isNewRecord', 'isNewRecord()', 'True if the record has not been inserted.', 'isNewRecord()'),
      method('isValid', 'isValid()', 'True if the table exists / record is valid.', 'isValid()'),
      method('isValidRecord', 'isValidRecord()', 'True if a row is currently loaded.', 'isValidRecord()'),
      method('next', 'next()', 'Advance to the next record.', 'next()'),
      method('operation', 'operation()', 'insert, update, delete, or query.', 'operation()'),
      method('orderBy', 'orderBy(field)', 'Ascending sort.', "orderBy('${1:field}')"),
      method('orderByDesc', 'orderByDesc(field)', 'Descending sort.', "orderByDesc('${1:field}')"),
      method('query', 'query([field], [value])', 'Execute the query.', 'query()'),
      method('setAbortAction', 'setAbortAction(abort)', 'Abort the current database action.', 'setAbortAction(true)'),
      method('setLimit', 'setLimit(max)', 'Limit rows returned.', 'setLimit(${1:100})'),
      method('setNewGuidValue', 'setNewGuidValue(guid)', 'Force sys_id on insert.', "setNewGuidValue('${1:sys_id}')"),
      method('setValue', 'setValue(field, value)', 'Set a field value.', "setValue('${1:field}', '${2:value}')"),
      method('setWorkflow', 'setWorkflow(enable)', 'Enable or skip engines/workflows.', 'setWorkflow(false)'),
      method('update', 'update([reason])', 'Update the current record.', 'update()'),
      method('updateMultiple', 'updateMultiple()', 'Update all records in the query.', 'updateMultiple()'),
    ],
  },
  GlideRecordSecure: {
    detail: 'ACL-aware GlideRecord',
    documentation: 'Same as GlideRecord but enforces ACLs on read/write.',
    construct: 'new GlideRecordSecure(${1:tableName})',
    methods: [
      method('addQuery', 'addQuery(field, [operator], value)', 'Add a query condition.', "addQuery('${1:field}', '${2:value}')"),
      method('query', 'query()', 'Execute the query with ACLs.', 'query()'),
      method('next', 'next()', 'Next readable record.', 'next()'),
      method('insert', 'insert()', 'Insert if ACL allows.', 'insert()'),
      method('update', 'update()', 'Update if ACL allows.', 'update()'),
    ],
  },
  GlideAggregate: {
    detail: 'Aggregate queries',
    documentation: 'COUNT, SUM, AVG, MIN, MAX grouped by fields.',
    construct: 'new GlideAggregate(${1:tableName})',
    methods: [
      method('addAggregate', 'addAggregate(type, [field])', "Add COUNT, SUM, AVG, MIN, or MAX.", "addAggregate('${1:COUNT}', '${2:sys_id}')"),
      method('addQuery', 'addQuery(field, [operator], value)', 'Filter rows.', "addQuery('${1:field}', '${2:value}')"),
      method('addEncodedQuery', 'addEncodedQuery(query)', 'Encoded query filter.', "addEncodedQuery('${1:active=true}')"),
      method('addTrend', 'addTrend(field, timeInterval)', 'Trend by date field.', "addTrend('${1:sys_created_on}', '${2:month}')"),
      method('getAggregate', 'getAggregate(type, [field])', 'Read aggregate value for the current group.', "getAggregate('${1:COUNT}')"),
      method('groupBy', 'groupBy(field)', 'Group results by a field.', "groupBy('${1:field}')"),
      method('orderByAggregate', 'orderByAggregate(type, [field])', 'Sort by aggregate.', "orderByAggregate('${1:COUNT}')"),
      method('query', 'query()', 'Run the aggregate query.', 'query()'),
      method('next', 'next()', 'Next group.', 'next()'),
      method('setGroup', 'setGroup(enable)', 'Enable or disable grouping.', 'setGroup(false)'),
    ],
  },
  GlideDateTime: {
    detail: 'Date/time values',
    documentation: 'UTC date-time arithmetic, display values, and durations.',
    construct: 'new GlideDateTime(${1:value})',
    methods: [
      method('addDaysLocalTime', 'addDaysLocalTime(days)', 'Add days in local time.', 'addDaysLocalTime(${1:1})'),
      method('addDaysUTC', 'addDaysUTC(days)', 'Add days in UTC.', 'addDaysUTC(${1:1})'),
      method('addSeconds', 'addSeconds(seconds)', 'Add seconds.', 'addSeconds(${1:60})'),
      method('compareTo', 'compareTo(other)', 'Compare to another GlideDateTime.', 'compareTo(${1:other})'),
      method('getDate', 'getDate()', 'Date portion as GlideDate.', 'getDate()'),
      method('getDayOfWeekLocalTime', 'getDayOfWeekLocalTime()', 'Day of week 1-7 local.', 'getDayOfWeekLocalTime()'),
      method('getDisplayValue', 'getDisplayValue()', 'User timezone display value.', 'getDisplayValue()'),
      method('getDisplayValueInternal', 'getDisplayValueInternal()', 'Internal format in user TZ.', 'getDisplayValueInternal()'),
      method('getLocalDate', 'getLocalDate()', 'Local date.', 'getLocalDate()'),
      method('getLocalTime', 'getLocalTime()', 'Local time.', 'getLocalTime()'),
      method('getNumericValue', 'getNumericValue()', 'Milliseconds since epoch.', 'getNumericValue()'),
      method('getValue', 'getValue()', 'UTC value yyyy-MM-dd HH:mm:ss.', 'getValue()'),
      method('onOrAfter', 'onOrAfter(other)', 'True if this >= other.', 'onOrAfter(${1:other})'),
      method('onOrBefore', 'onOrBefore(other)', 'True if this <= other.', 'onOrBefore(${1:other})'),
      method('setDisplayValue', 'setDisplayValue(value)', 'Set from user display format.', "setDisplayValue('${1:value}')"),
      method('setValue', 'setValue(value)', 'Set from UTC string or ms.', "setValue('${1:value}')"),
      method('subtract', 'subtract(start, end)', 'Duration between two date times.', 'subtract(${1:start}, ${2:end})'),
    ],
  },
  GlideDate: {
    detail: 'Date values',
    documentation: 'Date without time.',
    construct: 'new GlideDate()',
    methods: [
      method('getDisplayValue', 'getDisplayValue()', 'User display date.', 'getDisplayValue()'),
      method('getValue', 'getValue()', 'Internal yyyy-MM-dd.', 'getValue()'),
      method('setValue', 'setValue(value)', 'Set internal date.', "setValue('${1:value}')"),
    ],
  },
  GlideDuration: {
    detail: 'Duration values',
    documentation: 'Duration fields and SLA calculations.',
    construct: 'new GlideDuration(${1:ms})',
    methods: [
      method('getDayPart', 'getDayPart()', 'Whole days.', 'getDayPart()'),
      method('getDurationValue', 'getDurationValue()', 'd HH:mm:ss value.', 'getDurationValue()'),
      method('getNumericValue', 'getNumericValue()', 'Duration in milliseconds.', 'getNumericValue()'),
      method('add', 'add(other)', 'Add another duration.', 'add(${1:other})'),
      method('subtract', 'subtract(other)', 'Subtract a duration.', 'subtract(${1:other})'),
    ],
  },
  GlideFilter: {
    detail: 'Encoded query matcher',
    documentation: 'Test whether a record matches an encoded query.',
    methods: [
      method('checkRecord', 'GlideFilter.checkRecord(gr, query)', 'Static: record matches encoded query.', "GlideFilter.checkRecord(${1:gr}, '${2:query}')"),
    ],
  },
  GlideAjax: {
    detail: 'Client to Script Include',
    documentation: 'Client-side async call to a client-callable Script Include.',
    construct: 'new GlideAjax(${1:scriptIncludeName})',
    methods: [
      method('addParam', 'addParam(name, value)', 'Add sysparm parameter. Use sysparm_name for the method.', "addParam('${1:sysparm_name}', '${2:method}')"),
      method('getXML', 'getXML(callback)', 'Async XML callback.', 'getXML(${1:callback})'),
      method('getXMLAnswer', 'getXMLAnswer(callback)', 'Async callback receiving the answer string.', 'getXMLAnswer(${1:callback})'),
      method('getXMLWait', 'getXMLWait()', 'Synchronous call. Avoid in UI.', 'getXMLWait()'),
    ],
  },
  AbstractAjaxProcessor: {
    detail: 'GlideAjax processor',
    documentation: 'Base class for client-callable Script Includes.',
    methods: [
      method('getParameter', 'getParameter(name)', 'Read sysparm_* from the client.', "getParameter('${1:sysparm_id}')"),
      method('getName', 'getName()', 'sysparm_name method requested.', 'getName()'),
      method('newItem', 'newItem(name)', 'Add an XML item to the response.', "newItem('${1:name}')"),
    ],
  },
  RESTMessageV2: {
    detail: 'Outbound REST',
    documentation: 'Execute a REST message from server scripts.',
    construct: 'new sn_ws.RESTMessageV2(${1:name}, ${2:methodName})',
    methods: [
      method('setHttpMethod', 'setHttpMethod(method)', 'GET, POST, PUT, PATCH, DELETE.', "setHttpMethod('${1:POST}')"),
      method('setEndpoint', 'setEndpoint(url)', 'Override the endpoint URL.', "setEndpoint('${1:https://api.example.com}')"),
      method('setStringParameter', 'setStringParameter(name, value)', 'Substitute ${name} in the message.', "setStringParameter('${1:name}', '${2:value}')"),
      method('setStringParameterNoEscape', 'setStringParameterNoEscape(name, value)', 'Substitute without XML escape.', "setStringParameterNoEscape('${1:name}', '${2:value}')"),
      method('setRequestHeader', 'setRequestHeader(name, value)', 'HTTP header.', "setRequestHeader('${1:Content-Type}', '${2:application/json}')"),
      method('setRequestBody', 'setRequestBody(body)', 'Raw request body.', 'setRequestBody(${1:body})'),
      method('setQueryParameter', 'setQueryParameter(name, value)', 'Query string parameter.', "setQueryParameter('${1:name}', '${2:value}')"),
      method('setMIDServer', 'setMIDServer(name)', 'Send through a MID Server.', "setMIDServer('${1:MID_NAME}')"),
      method('setEccParameter', 'setEccParameter(name, value)', 'ECC queue parameter for MID.', "setEccParameter('${1:name}', '${2:value}')"),
      method('setBasicAuth', 'setBasicAuth(user, password)', 'Basic authentication.', "setBasicAuth('${1:user}', '${2:password}')"),
      method('setMutualAuth', 'setMutualAuth(profile)', 'Mutual auth profile.', "setMutualAuth('${1:profile}')"),
      method('execute', 'execute()', 'Synchronous execute. Returns RESTResponseV2.', 'execute()'),
      method('executeAsync', 'executeAsync()', 'Async execute via ECC queue.', 'executeAsync()'),
    ],
  },
  RESTResponseV2: {
    detail: 'Outbound REST response',
    documentation: 'Status, headers, and body from RESTMessageV2.execute().',
    methods: [
      method('getStatusCode', 'getStatusCode()', 'HTTP status code.', 'getStatusCode()'),
      method('getBody', 'getBody()', 'Response body as string.', 'getBody()'),
      method('getHeader', 'getHeader(name)', 'A response header.', "getHeader('${1:Content-Type}')"),
      method('getHeaders', 'getHeaders()', 'All headers.', 'getHeaders()'),
      method('getErrorCode', 'getErrorCode()', 'Error code if the request failed.', 'getErrorCode()'),
      method('getErrorMessage', 'getErrorMessage()', 'Error message.', 'getErrorMessage()'),
      method('haveError', 'haveError()', 'True if an error occurred.', 'haveError()'),
      method('waitForResponse', 'waitForResponse(timeoutSecs)', 'Wait for async execute.', 'waitForResponse(${1:30})'),
    ],
  },
  SOAPMessageV2: {
    detail: 'Outbound SOAP',
    documentation: 'Execute a SOAP message from server scripts.',
    construct: 'new sn_ws.SOAPMessageV2(${1:name}, ${2:functionName})',
    methods: [
      method('setStringParameter', 'setStringParameter(name, value)', 'Replace a ${parameter}.', "setStringParameter('${1:name}', '${2:value}')"),
      method('setHttpTimeout', 'setHttpTimeout(ms)', 'Timeout in milliseconds.', 'setHttpTimeout(${1:10000})'),
      method('setMIDServer', 'setMIDServer(name)', 'Route via MID Server.', "setMIDServer('${1:MID_NAME}')"),
      method('execute', 'execute()', 'Run the SOAP request.', 'execute()'),
      method('executeAsync', 'executeAsync()', 'Async SOAP via ECC.', 'executeAsync()'),
    ],
  },
  RESTAPIRequest: {
    detail: 'Scripted REST request',
    documentation: 'Inbound REST request in a Scripted REST API script.',
    methods: [
      method('getHeader', 'getHeader(name)', 'Request header.', "getHeader('${1:Accept}')"),
      method('getRequestedQueryParameter', 'queryParams.name', 'Use request.queryParams.', 'queryParams.${1:name}'),
      method('body', 'request.body', 'RESTAPIRequestBody.', 'body'),
    ],
  },
  RESTAPIResponse: {
    detail: 'Scripted REST response',
    documentation: 'Set status, headers, and body for Scripted REST APIs.',
    methods: [
      method('setStatus', 'setStatus(code)', 'HTTP status.', 'setStatus(${1:200})'),
      method('setHeader', 'setHeader(name, value)', 'Response header.', "setHeader('${1:Content-Type}', '${2:application/json}')"),
      method('setBody', 'setBody(object)', 'JSON-serializable body.', 'setBody(${1:result})'),
      method('setError', 'setError(error)', 'Error payload.', 'setError(${1:error})'),
      method('setContentType', 'setContentType(type)', 'Content-Type.', "setContentType('${1:application/json}')"),
    ],
  },
  JSON: {
    detail: 'JSON helper',
    documentation: 'ServiceNow JSON (Rhino). Prefer JSON.parse / JSON.stringify in modern instances; global.JSON also exists.',
    methods: [
      method('parse', 'JSON.parse(text)', 'Parse JSON text.', 'parse(${1:text})'),
      method('stringify', 'JSON.stringify(value)', 'Serialize to JSON.', 'stringify(${1:value})'),
      method('decode', 'new JSON().decode(text)', 'Legacy decode.', 'decode(${1:text})'),
      method('encode', 'new JSON().encode(value)', 'Legacy encode.', 'encode(${1:value})'),
    ],
  },
  GlideSysAttachment: {
    detail: 'Attachments',
    documentation: 'Create, copy, and read attachments.',
    construct: 'new GlideSysAttachment()',
    methods: [
      method('write', 'write(record, fileName, contentType, content)', 'Attach content to a record.', "write(${1:gr}, '${2:file.txt}', '${3:text/plain}', ${4:content})"),
      method('copy', 'copy(sourceTable, sourceId, targetTable, targetId)', 'Copy attachments.', "copy('${1:incident}', ${2:fromId}, '${3:incident}', ${4:toId})"),
      method('getContent', 'getContent(attachmentRecord)', 'Attachment bytes as string.', 'getContent(${1:attachmentGr})'),
      method('deleteAttachment', 'deleteAttachment(sysId)', 'Delete an attachment.', "deleteAttachment('${1:sys_id}')"),
    ],
  },
  GlideImportSet: {
    detail: 'Import set',
    documentation: 'Load data into an import set table.',
    methods: [
      method('load', 'load()', 'Load import set rows.', 'load()'),
    ],
  },
  GlideImportSetRun: {
    detail: 'Import set run',
    documentation: 'Transform an import set.',
    construct: 'new GlideImportSetRun(${1:importSetSysId})',
    methods: [
      method('getImportSetRun', 'getImportSetRun()', 'Current run record.', 'getImportSetRun()'),
    ],
  },
  GlideTransformMap: {
    detail: 'Transform map',
    documentation: 'Used in transform scripts: source, target, map, log, ignore, error.',
  },
  IdentificationEngine: {
    detail: 'IRE',
    documentation: 'CMDB Identification and Reconciliation Engine.',
    methods: [
      method('identifyCI', 'IdentificationEngine.identifyCI(json)', 'Identify/reconcile a CI payload.', 'IdentificationEngine.identifyCI(${1:json})'),
      method('createOrUpdateCI', 'IdentificationEngine.createOrUpdateCI(source, json)', 'Insert or update CI via IRE.', "IdentificationEngine.createOrUpdateCI('${1:ServiceNow}', ${2:json})"),
    ],
  },
  CMDBTransformUtil: {
    detail: 'CMDB transform helper',
    documentation: 'Helpers for transform maps into CMDB.',
    construct: 'new CMDBTransformUtil()',
    methods: [
      method('identifyCI', 'identifyCI(source)', 'Identify CI from import row.', 'identifyCI(${1:source})'),
    ],
  },
  Workflow: {
    detail: 'Workflow API',
    documentation: 'Start, cancel, and broadcast workflows.',
    construct: 'new Workflow()',
    methods: [
      method('startFlow', 'startFlow(workflowId, current, operation, vars)', 'Start a workflow on a record.', "startFlow('${1:sys_id}', ${2:current}, ${3:current.operation()}, ${4:vars})"),
      method('broadcastEvent', 'broadcastEvent(recordId, event)', 'Broadcast to running workflows.', "broadcastEvent('${1:sys_id}', '${2:event}')"),
      method('cancel', 'cancel(record)', 'Cancel workflows on a record.', 'cancel(${1:current})'),
      method('getRunningFlows', 'getRunningFlows(record)', 'Active flows for a record.', 'getRunningFlows(${1:current})'),
    ],
  },
  GlideRunScriptJob: {
    detail: 'Scheduled script',
    documentation: 'Schedule a script to run later.',
    methods: [
      method('scheduleScript', 'GlideRunScriptJob.scheduleScript(script)', 'Run script asynchronously.', 'GlideRunScriptJob.scheduleScript(${1:script})'),
    ],
  },
  GlideGroup: {
    detail: 'Group helper',
    documentation: 'sys_user_group utilities.',
  },
  GlideUser: {
    detail: 'User API (client g_user / server gs.getUser())',
    documentation: 'User identity and roles.',
    methods: [
      method('getID', 'getID()', 'User sys_id.', 'getID()'),
      method('getName', 'getName()', 'User name.', 'getName()'),
      method('getDisplayName', 'getDisplayName()', 'Display name.', 'getDisplayName()'),
      method('getEmail', 'getEmail()', 'Email.', 'getEmail()'),
      method('hasRole', 'hasRole(role)', 'True if the user has the role.', "hasRole('${1:itil}')"),
      method('getCompanyID', 'getCompanyID()', 'Company sys_id.', 'getCompanyID()'),
    ],
  },
  Class: {
    detail: 'Script Include class helper',
    documentation: 'Prototype helper used by Script Includes.',
    methods: [
      method('create', 'Class.create()', 'Create a Script Include class.', 'create()'),
    ],
  },
  sn_ws: {
    detail: 'Web services namespace',
    documentation: 'Contains RESTMessageV2, SOAPMessageV2, RESTAPIRequest, RESTAPIResponse.',
  },
  sn_hw: {
    detail: 'Automation / IntegrationHub',
    documentation: 'Spoke and action APIs on some releases.',
  },
};

export const SNOW_NAMESPACES = {
  gs: {
    detail: 'GlideSystem',
    methods: [
      method('info', 'gs.info(message, [p1], ...)', 'Info log (preferred).', "info('${1:message}')"),
      method('log', 'gs.log(message, [source])', 'Log at info with optional source.', "log('${1:message}')"),
      method('error', 'gs.error(message)', 'Error log.', "error('${1:message}')"),
      method('warn', 'gs.warn(message)', 'Warn log.', "warn('${1:message}')"),
      method('debug', 'gs.debug(message)', 'Debug log.', "debug('${1:message}')"),
      method('addInfoMessage', 'gs.addInfoMessage(message)', 'UI info message.', "addInfoMessage('${1:message}')"),
      method('addErrorMessage', 'gs.addErrorMessage(message)', 'UI error message.', "addErrorMessage('${1:message}')"),
      method('getUserID', 'gs.getUserID()', 'Current user sys_id.', 'getUserID()'),
      method('getUserName', 'gs.getUserName()', 'Current user name.', 'getUserName()'),
      method('getUserDisplayName', 'gs.getUserDisplayName()', 'Current user display name.', 'getUserDisplayName()'),
      method('getUser', 'gs.getUser()', 'GlideUser for the session.', 'getUser()'),
      method('hasRole', 'gs.hasRole(role)', 'Current user has role.', "hasRole('${1:itil}')"),
      method('getProperty', 'gs.getProperty(name, [default])', 'Read a sys_properties value.', "getProperty('${1:name}')"),
      method('setProperty', 'gs.setProperty(name, value)', 'Set a property (use sparingly).', "setProperty('${1:name}', '${2:value}')"),
      method('nil', 'gs.nil(value)', 'True if null, undefined, or empty string.', 'nil(${1:value})'),
      method('eventQueue', 'gs.eventQueue(name, record, parm1, parm2, [queue])', 'Queue an event.', "eventQueue('${1:event.name}', ${2:current}, '${3:parm1}', '${4:parm2}')"),
      method('eventQueueScheduled', 'gs.eventQueueScheduled(name, record, parm1, parm2, dateTime)', 'Queue a delayed event.', "eventQueueScheduled('${1:event.name}', ${2:current}, '', '', ${3:gdt})"),
      method('nowDateTime', 'gs.nowDateTime()', 'Current date/time display value.', 'nowDateTime()'),
      method('now', 'gs.now()', 'Current date (internal).', 'now()'),
      method('minutesAgo', 'gs.minutesAgo(minutes)', 'DateTime minutes ago.', 'minutesAgo(${1:30})'),
      method('daysAgo', 'gs.daysAgo(days)', 'DateTime days ago.', 'daysAgo(${1:1})'),
      method('beginningOfToday', 'gs.beginningOfToday()', 'Start of today.', 'beginningOfToday()'),
      method('endOfToday', 'gs.endOfToday()', 'End of today.', 'endOfToday()'),
      method('dateGenerate', 'gs.dateGenerate(date, time)', 'Build a date/time.', "dateGenerate('${1:2026-01-01}', '${2:00:00:00}')"),
      method('getSession', 'gs.getSession()', 'Current session.', 'getSession()'),
      method('include', 'gs.include(name)', 'Load a Script Include (legacy).', "include('${1:Name}')"),
      method('tableExists', 'gs.tableExists(name)', 'True if the table exists.', "tableExists('${1:incident}')"),
      method('generateGUID', 'gs.generateGUID()', 'New sys_id.', 'generateGUID()'),
      method('urlEncode', 'gs.urlEncode(value)', 'URL-encode a string.', 'urlEncode(${1:value})'),
      method('base64Encode', 'gs.base64Encode(value)', 'Base64 encode.', 'base64Encode(${1:value})'),
      method('base64Decode', 'gs.base64Decode(value)', 'Base64 decode.', 'base64Decode(${1:value})'),
      method('sleep', 'gs.sleep(ms)', 'Sleep (avoid in user-facing rules).', 'sleep(${1:1000})'),
    ],
  },
  g_form: {
    detail: 'GlideForm',
    methods: [
      method('getValue', 'g_form.getValue(field)', 'Field value as string.', "getValue('${1:field}')"),
      method('setValue', 'g_form.setValue(field, value, [display])', 'Set a field value.', "setValue('${1:field}', '${2:value}')"),
      method('clearValue', 'g_form.clearValue(field)', 'Clear a field.', "clearValue('${1:field}')"),
      method('setMandatory', 'g_form.setMandatory(field, mandatory)', 'Toggle mandatory.', "setMandatory('${1:field}', true)"),
      method('setDisplay', 'g_form.setDisplay(field, display)', 'Show or hide a field.', "setDisplay('${1:field}', false)"),
      method('setVisible', 'g_form.setVisible(field, visible)', 'Visibility (section-aware).', "setVisible('${1:field}', true)"),
      method('setReadOnly', 'g_form.setReadOnly(field, readOnly)', 'Read-only toggle.', "setReadOnly('${1:field}', true)"),
      method('setDisabled', 'g_form.setDisabled(field, disabled)', 'Disable a field.', "setDisabled('${1:field}', true)"),
      method('showFieldMsg', 'g_form.showFieldMsg(field, message, type, [scroll])', "type: info, warning, error.", "showFieldMsg('${1:field}', '${2:message}', '${3:error}')"),
      method('hideFieldMsg', 'g_form.hideFieldMsg(field, [clearAll])', 'Hide field messages.', "hideFieldMsg('${1:field}')"),
      method('addInfoMessage', 'g_form.addInfoMessage(message)', 'Form info flash.', "addInfoMessage('${1:message}')"),
      method('addErrorMessage', 'g_form.addErrorMessage(message)', 'Form error flash.', "addErrorMessage('${1:message}')"),
      method('clearMessages', 'g_form.clearMessages()', 'Clear flash messages.', 'clearMessages()'),
      method('getTableName', 'g_form.getTableName()', 'Current table.', 'getTableName()'),
      method('getUniqueValue', 'g_form.getUniqueValue()', 'Current sys_id.', 'getUniqueValue()'),
      method('isNewRecord', 'g_form.isNewRecord()', 'True on new records.', 'isNewRecord()'),
      method('save', 'g_form.save()', 'Save (stay on form).', 'save()'),
      method('submit', 'g_form.submit()', 'Submit the form.', 'submit()'),
      method('addOption', 'g_form.addOption(field, value, label, [index])', 'Add a choice.', "addOption('${1:field}', '${2:value}', '${3:label}')"),
      method('removeOption', 'g_form.removeOption(field, value)', 'Remove a choice.', "removeOption('${1:field}', '${2:value}')"),
      method('clearOptions', 'g_form.clearOptions(field)', 'Clear choices.', "clearOptions('${1:field}')"),
      method('getReference', 'g_form.getReference(field, callback)', 'Async reference record.', "getReference('${1:caller_id}', ${2:callback})"),
      method('flash', 'g_form.flash(widget, color, count)', 'Flash a field.', "flash('${1:field}', '${2:#FFFACD}', ${3:0})"),
    ],
  },
  g_user: {
    detail: 'Client GlideUser',
    methods: [
      method('userID', 'g_user.userID', 'User sys_id property.', 'userID'),
      method('userName', 'g_user.userName', 'User name property.', 'userName'),
      method('firstName', 'g_user.firstName', 'First name.', 'firstName'),
      method('lastName', 'g_user.lastName', 'Last name.', 'lastName'),
      method('hasRole', 'g_user.hasRole(role)', 'Role check (includes admin).', "hasRole('${1:itil}')"),
      method('hasRoleExactly', 'g_user.hasRoleExactly(role)', 'Role check without admin bypass.', "hasRoleExactly('${1:itil}')"),
      method('getFullName', 'g_user.getFullName()', 'Display name.', 'getFullName()'),
      method('getClientData', 'g_user.getClientData(key)', 'Session client data.', "getClientData('${1:key}')"),
    ],
  },
  current: {
    detail: 'Current GlideRecord',
    methods: [
      method('getValue', 'current.getValue(field)', 'Read a field.', "getValue('${1:field}')"),
      method('setValue', 'current.setValue(field, value)', 'Write a field.', "setValue('${1:field}', '${2:value}')"),
      method('getDisplayValue', 'current.getDisplayValue(field)', 'Display value.', "getDisplayValue('${1:field}')"),
      method('update', 'current.update()', 'Save the current record.', 'update()'),
      method('insert', 'current.insert()', 'Insert the current record.', 'insert()'),
      method('setAbortAction', 'current.setAbortAction(true)', 'Abort the database action.', 'setAbortAction(true)'),
      method('isNewRecord', 'current.isNewRecord()', 'True before first insert.', 'isNewRecord()'),
      method('getTableName', 'current.getTableName()', 'Table name.', 'getTableName()'),
      method('getUniqueValue', 'current.getUniqueValue()', 'sys_id.', 'getUniqueValue()'),
      method('operation', 'current.operation()', 'insert/update/delete.', 'operation()'),
      method('changes', 'current.field.changes()', 'True if the field changed.', '${1:state}.changes()'),
      method('changesTo', 'current.field.changesTo(value)', 'Field changed to value.', "${1:state}.changesTo('${2:7}')"),
      method('changesFrom', 'current.field.changesFrom(value)', 'Field changed from value.', "${1:state}.changesFrom('${2:2}')"),
      method('nil', 'current.field.nil()', 'Field is empty.', '${1:assignment_group}.nil()'),
    ],
  },
  previous: {
    detail: 'Previous GlideRecord',
    methods: [
      method('getValue', 'previous.getValue(field)', 'Previous field value.', "getValue('${1:field}')"),
      method('getDisplayValue', 'previous.getDisplayValue(field)', 'Previous display value.', "getDisplayValue('${1:field}')"),
    ],
  },
  template: {
    detail: 'Notification printer',
    methods: [
      method('print', 'template.print(html)', 'Write notification body HTML.', "print('${1:<p>Hello</p>}')"),
    ],
  },
  request: {
    detail: 'RESTAPIRequest',
    methods: [
      method('pathParams', 'request.pathParams', 'Path parameters object.', 'pathParams'),
      method('queryParams', 'request.queryParams', 'Query parameters object.', 'queryParams'),
      method('body', 'request.body', 'RESTAPIRequestBody.', 'body'),
      method('headers', 'request.headers', 'Header map.', 'headers'),
      method('getHeader', 'request.getHeader(name)', 'One header.', "getHeader('${1:Authorization}')"),
      method('getRequestedQueryParameter', 'request.queryParams.name', 'Preferred query access.', 'queryParams.${1:id}'),
    ],
  },
  response: {
    detail: 'RESTAPIResponse',
    methods: [
      method('setStatus', 'response.setStatus(code)', 'HTTP status.', 'setStatus(${1:200})'),
      method('setBody', 'response.setBody(obj)', 'JSON body.', 'setBody(${1:result})'),
      method('setHeader', 'response.setHeader(name, value)', 'Header.', "setHeader('${1:Content-Type}', 'application/json')"),
      method('setContentType', 'response.setContentType(type)', 'Content type.', "setContentType('application/json')"),
    ],
  },
};

export const SNOW_SNIPPETS = [
  {
    label: 'GlideRecord query loop',
    insertText: `var ${1:gr} = new GlideRecord('\${2:incident}');
$1.addQuery('\${3:active}', true);
$1.query();
while ($1.next()) {
  gs.info($1.getValue('\${4:number}'));
}`,
    documentation: 'Standard GlideRecord query and iteration.',
  },
  {
    label: 'GlideRecord get + update',
    insertText: `var ${1:gr} = new GlideRecord('\${2:incident}');
if ($1.get('\${3:sys_id}')) {
  $1.setValue('\${4:state}', '\${5:2}');
  $1.update();
}`,
    documentation: 'Load one record by sys_id and update it.',
  },
  {
    label: 'GlideAggregate COUNT',
    insertText: `var ${1:ga} = new GlideAggregate('\${2:incident}');
$1.addAggregate('COUNT');
$1.addQuery('\${3:active}', true);
$1.query();
if ($1.next()) {
  var count = parseInt($1.getAggregate('COUNT'), 10);
}`,
    documentation: 'Count records with GlideAggregate.',
  },
  {
    label: 'RESTMessageV2 JSON POST',
    insertText: `var rm = new sn_ws.RESTMessageV2();
rm.setHttpMethod('POST');
rm.setEndpoint('\${1:https://api.example.com/v1/items}');
rm.setRequestHeader('Content-Type', 'application/json');
rm.setRequestBody(JSON.stringify({ \${2:key}: '\${3:value}' }));
var res = rm.execute();
var body = res.getBody();
var status = res.getStatusCode();`,
    documentation: 'Outbound REST POST with JSON body.',
  },
  {
    label: 'GlideAjax client call',
    insertText: `var ga = new GlideAjax('\${1:ScriptIncludeName}');
ga.addParam('sysparm_name', '\${2:methodName}');
ga.addParam('\${3:sysparm_id}', g_form.getUniqueValue());
ga.getXMLAnswer(function(answer) {
  \${4:// use answer}
});`,
    documentation: 'Client GlideAjax to a Script Include method.',
  },
  {
    label: 'Script Include Class.create',
    insertText: `var \${1:MyInclude} = Class.create();
$1.prototype = {
  initialize: function() {
  },
  \${2:method}: function() {
    \${3:}
  },
  type: '$1'
};`,
    documentation: 'Server Script Include skeleton.',
  },
  {
    label: 'Client-callable Script Include',
    insertText: `var \${1:MyAjax} = Class.create();
$1.prototype = Object.extend(new AbstractAjaxProcessor(), {
  \${2:method}: function() {
    var id = this.getParameter('sysparm_id');
    return id;
  },
  type: '$1'
});`,
    documentation: 'GlideAjax processor Script Include.',
  },
];

export const SNOW_TABLES = [
  'incident',
  'problem',
  'problem_task',
  'change_request',
  'change_task',
  'sc_request',
  'sc_req_item',
  'sc_task',
  'sc_cat_item',
  'kb_knowledge',
  'kb_feedback',
  'cmdb_ci',
  'cmdb_rel_ci',
  'alm_asset',
  'alm_hardware',
  'task_sla',
  'contract_sla',
  'sys_user',
  'sys_user_group',
  'sys_user_grmember',
  'sysapproval_approver',
  'incident_task',
  'em_alert',
  'sys_attachment',
  'sys_email',
  'sys_import_set',
  'sys_import_set_row',
  'ecc_queue',
  'sys_rest_message',
  'sys_web_service',
];
