copyRelease();

function copyRelease() {
    var releaseTable = 'rm_release';
    var originalSysId = current.getUniqueValue();
    var clearVariables = { change_request: true };
    var clearMrvsColumns = {
        u_agile_implementation_plan: { planned_start_time: true, planned_end_time: true }
    };

    var release = new GlideRecord(releaseTable);
    release.initialize();
    release.short_description = 'Copy of - ' + current.short_description;
    release.description = current.description;
    if (!release.insert()) {
        gs.addErrorMessage('Failed to create copied Release.');
        return;
    }
    var newReleaseSysId = release.getUniqueValue();
    action.setRedirectURL(release);

    var producedRecord = new GlideRecord('sc_item_produced_record');
    producedRecord.addQuery('task', originalSysId).addOrCondition('record_key', originalSysId);
    producedRecord.setLimit(1);
    producedRecord.query();
    if (producedRecord.next())
        insertRecord('sc_item_produced_record', {
            producer: producedRecord.producer, record_table: releaseTable,
            task: newReleaseSysId, record_key: newReleaseSysId
        });

    var variableCache = {};
    var copiedAnswerByOldId = {};
    var mrvsAnswerBySet = {};
    var onlyMrvsAnswerId = '';
    var mrvsParentCount = 0;
    var oldAnswerIds = [];

    var questionAnswer = new GlideRecord('question_answer');
    questionAnswer.addQuery('table_sys_id', originalSysId);
    questionAnswer.query();
    while (questionAnswer.next()) {
        var questionId = questionAnswer.question.toString();
        var variable = getVariable(questionId, variableCache);
        var copiedAnswerId = insertRecord('question_answer', {
            table_name: releaseTable, table_sys_id: newReleaseSysId,
            question: questionId, order: questionAnswer.order,
            value: clearVariables[variable.name] ? ''
                : clearMrvsJson(questionAnswer.value.toString(), variable.variableSetName, clearMrvsColumns),
            question_choice: clearVariables[variable.name] ? '' : questionAnswer.question_choice
        });
        copiedAnswerByOldId[questionAnswer.getUniqueValue()] = copiedAnswerId;
        oldAnswerIds.push(questionAnswer.getUniqueValue());
        if (variable.type != '21')
            continue;
        if (variable.variableSetId)
            mrvsAnswerBySet[variable.variableSetId] = copiedAnswerId;
        onlyMrvsAnswerId = copiedAnswerId;
        mrvsParentCount++;
    }
    if (mrvsParentCount != 1)
        onlyMrvsAnswerId = '';

    var mrvsRow = new GlideRecord('sc_multi_row_question_answer');
    var mrvsQuery = mrvsRow.addQuery('parent_id', originalSysId);
    if (oldAnswerIds.length) {
        mrvsQuery.addOrCondition('parent_id', 'IN', oldAnswerIds.join(','));
        mrvsQuery.addOrCondition('question_answer', 'IN', oldAnswerIds.join(','));
    }
    mrvsRow.query();
    while (mrvsRow.next()) {
        var column = getVariable(mrvsRow.item_option_new.toString(), variableCache);
        var clearColumn = clearMrvsColumns[column.variableSetName] && clearMrvsColumns[column.variableSetName][column.name];
        var oldParentId = mrvsRow.parent_id.toString();
        insertRecord('sc_multi_row_question_answer', {
            parent_table_name: releaseTable, variable_set: mrvsRow.variable_set,
            item_option_new: mrvsRow.item_option_new, row_index: mrvsRow.row_index,
            value: clearColumn ? '' : mrvsRow.value,
            display_value: clearColumn ? '' : mrvsRow.display_value,
            parent_id: oldParentId == originalSysId ? newReleaseSysId : (copiedAnswerByOldId[oldParentId] || newReleaseSysId),
            question_answer: copiedAnswerByOldId[mrvsRow.question_answer.toString()]
                || mrvsAnswerBySet[mrvsRow.variable_set.toString()] || onlyMrvsAnswerId || ''
        });
    }

    gs.addInfoMessage('Release copied successfully.');
}

function insertRecord(table, fields) {
    var record = new GlideRecord(table);
    record.initialize();
    for (var field in fields)
        if (record.isValidField(field))
            record[field] = fields[field];
    return record.insert();
}

function clearMrvsJson(jsonValue, variableSetName, clearMrvsColumns) {
    if (!jsonValue || jsonValue.charAt(0) != '[')
        return jsonValue;
    try {
        var rows = JSON.parse(jsonValue);
        var columns = clearMrvsColumns[variableSetName] || {};
        if (!clearMrvsColumns[variableSetName])
            for (var setName in clearMrvsColumns)
                for (var columnName in clearMrvsColumns[setName])
                    if (rows[0] && rows[0].hasOwnProperty(columnName))
                        columns[columnName] = true;
        for (var i = 0; i < rows.length; i++)
            for (var columnName in columns)
                if (rows[i].hasOwnProperty(columnName))
                    rows[i][columnName] = '';
        return JSON.stringify(rows);
    } catch (e) {
        return jsonValue;
    }
}

function getVariable(questionId, variableCache) {
    if (variableCache[questionId])
        return variableCache[questionId];
    var variable = { name: '', type: '', variableSetId: '', variableSetName: '' };
    var catalogVariable = new GlideRecord('item_option_new');
    if (catalogVariable.get(questionId)) {
        variable.name = catalogVariable.name.toString();
        variable.type = catalogVariable.type.toString();
        variable.variableSetId = catalogVariable.variable_set.toString();
        variable.variableSetName = catalogVariable.variable_set.internal_name.toString()
            || catalogVariable.variable_set.name.toString();
    }
    variableCache[questionId] = variable;
    return variable;
}
