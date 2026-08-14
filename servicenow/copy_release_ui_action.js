// Copy Release — server UI Action on rm_release (form button)
copyRelease();

function copyRelease() {
    var TABLE = 'rm_release';
    var srcId = current.getUniqueValue();
    var CLEAR_VARS = { change_request: true };
    var CLEAR_MRVS = {
        u_agile_implementation_plan: {
            planned_start_time: true,
            planned_end_time: true
        }
    };

    var rel = new GlideRecord(TABLE);
    rel.initialize();
    rel.short_description = 'Copy of - ' + current.short_description;
    rel.description = current.description;
    if (!rel.insert()) {
        gs.addErrorMessage('Failed to create copied Release.');
        return;
    }

    var dstId = rel.getUniqueValue();
    action.setRedirectURL(rel);
    copyProducerLink(srcId, dstId, TABLE);

    var varCache = {};
    var qaMap = {};
    var questionMap = {};

    var qa = new GlideRecord('question_answer');
    qa.addQuery('table_sys_id', srcId);
    qa.query();

    while (qa.next()) {
        var qid = qa.question.toString();
        var v = getVariable(qid, varCache);
        var val = CLEAR_VARS[v.name] ? '' : clearMrvsJson(qa.value.toString(), v.variableSetName, CLEAR_MRVS);

        var nqa = new GlideRecord('question_answer');
        nqa.initialize();
        nqa.table_name = TABLE;
        nqa.table_sys_id = dstId;
        nqa.question = qid;
        nqa.order = qa.order;
        nqa.value = val;
        if (nqa.isValidField('question_choice'))
            nqa.question_choice = CLEAR_VARS[v.name] ? '' : qa.question_choice;

        var nqaId = nqa.insert();
        qaMap[qa.getUniqueValue()] = nqaId;
        questionMap[qid] = nqaId;
    }

    copyMrvsRows(srcId, dstId, TABLE, qaMap, questionMap, varCache, CLEAR_MRVS);
    gs.addInfoMessage('Release copied successfully.');
}

function copyProducerLink(srcId, dstId, table) {
    var pr = new GlideRecord('sc_item_produced_record');
    pr.addQuery('task', srcId).addOrCondition('record_key', srcId);
    pr.setLimit(1);
    pr.query();
    if (!pr.next())
        return;

    var np = new GlideRecord('sc_item_produced_record');
    np.initialize();
    np.producer = pr.producer;
    np.record_table = table;
    np.task = dstId;
    np.record_key = dstId;
    np.insert();
}

function copyMrvsRows(srcId, dstId, table, qaMap, questionMap, varCache, clearMrvs) {
    var ids = [];
    for (var id in qaMap)
        ids.push(id);

    var mrvs = new GlideRecord('sc_multi_row_question_answer');
    var q = mrvs.addQuery('parent_id', srcId);
    if (ids.length) {
        q.addOrCondition('parent_id', 'IN', ids.join(','));
        q.addOrCondition('question_answer', 'IN', ids.join(','));
    }
    mrvs.query();

    var setQaMap = buildSetQaMap(questionMap, varCache);

    while (mrvs.next()) {
        var v = getVariable(mrvs.item_option_new.toString(), varCache);
        var clear = !!(clearMrvs[v.variableSetName] && clearMrvs[v.variableSetName][v.name]);

        var row = new GlideRecord('sc_multi_row_question_answer');
        row.initialize();
        row.parent_table_name = table;
        row.variable_set = mrvs.variable_set;
        row.item_option_new = mrvs.item_option_new;
        row.row_index = mrvs.row_index;
        row.value = clear ? '' : mrvs.value;
        if (row.isValidField('display_value'))
            row.display_value = clear ? '' : mrvs.display_value;

        var oldParent = mrvs.parent_id.toString();
        row.parent_id = oldParent == srcId ? dstId : (qaMap[oldParent] || dstId);

        var oldQa = mrvs.question_answer.toString();
        row.question_answer = qaMap[oldQa] || setQaMap[mrvs.variable_set.toString()] || setQaMap._single || '';
        row.insert();
    }
}

function clearMrvsJson(value, setName, clearMrvs) {
    if (!value || value.charAt(0) != '[')
        return value;

    try {
        var rows = JSON.parse(value);
        if (!rows || !rows.length || typeof rows[0] != 'object')
            return value;

        var cols = clearMrvs[setName];
        if (!cols) {
            cols = {};
            var found = false;
            for (var s in clearMrvs) {
                for (var c in clearMrvs[s]) {
                    if (rows[0].hasOwnProperty(c)) {
                        cols[c] = true;
                        found = true;
                    }
                }
            }
            if (!found)
                return value;
        }

        for (var i = 0; i < rows.length; i++) {
            for (var col in cols) {
                if (rows[i].hasOwnProperty(col))
                    rows[i][col] = '';
            }
        }
        return JSON.stringify(rows);
    } catch (e) {
        return value;
    }
}

function buildSetQaMap(questionMap, varCache) {
    var map = { _single: '' };
    var type21 = [];

    for (var qid in questionMap) {
        var v = getVariable(qid, varCache);
        if (v.type != '21')
            continue;
        if (v.variableSetId)
            map[v.variableSetId] = questionMap[qid];
        type21.push(questionMap[qid]);
    }

    if (type21.length == 1)
        map._single = type21[0];

    return map;
}

function getVariable(questionId, cache) {
    if (cache[questionId])
        return cache[questionId];

    var r = { name: '', type: '', variableSetId: '', variableSetName: '' };
    var gr = new GlideRecord('item_option_new');
    if (gr.get(questionId)) {
        r.name = gr.name.toString();
        r.type = gr.type.toString();
        r.variableSetId = gr.variable_set.toString();
        r.variableSetName = gr.variable_set.internal_name.toString() || gr.variable_set.name.toString();
    }
    cache[questionId] = r;
    return r;
}
