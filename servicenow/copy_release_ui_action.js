copyRelease();

function copyRelease() {
    var releaseTable = 'rm_release';
    var originalSysId = current.getUniqueValue();

    var variablesToClear = {
        change_request: true
    };

    var mrvsColumnsToClear = {
        u_agile_implementation_plan: {
            planned_start_time: true,
            planned_end_time: true
        }
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

    copyRecordProducerLink(originalSysId, newReleaseSysId, releaseTable);

    var variableCache = {};
    var copiedAnswers = copyQuestionAnswers(
        originalSysId,
        newReleaseSysId,
        releaseTable,
        variablesToClear,
        mrvsColumnsToClear,
        variableCache
    );

    copyMultiRowAnswers(
        originalSysId,
        newReleaseSysId,
        releaseTable,
        copiedAnswers,
        variableCache,
        mrvsColumnsToClear
    );

    gs.addInfoMessage('Release copied successfully.');
}

function copyRecordProducerLink(originalSysId, newReleaseSysId, releaseTable) {
    var producedRecord = new GlideRecord('sc_item_produced_record');
    producedRecord.addQuery('task', originalSysId)
        .addOrCondition('record_key', originalSysId);
    producedRecord.setLimit(1);
    producedRecord.query();

    if (!producedRecord.next())
        return;

    var copiedProducedRecord = new GlideRecord('sc_item_produced_record');
    copiedProducedRecord.initialize();
    copiedProducedRecord.producer = producedRecord.producer;
    copiedProducedRecord.record_table = releaseTable;
    copiedProducedRecord.task = newReleaseSysId;
    copiedProducedRecord.record_key = newReleaseSysId;
    copiedProducedRecord.insert();
}

function copyQuestionAnswers(
    originalSysId,
    newReleaseSysId,
    releaseTable,
    variablesToClear,
    mrvsColumnsToClear,
    variableCache
) {
    var copiedAnswerByOriginalId = {};
    var copiedAnswerByQuestionId = {};

    var questionAnswer = new GlideRecord('question_answer');
    questionAnswer.addQuery('table_sys_id', originalSysId);
    questionAnswer.query();

    while (questionAnswer.next()) {
        var questionId = questionAnswer.question.toString();
        var variable = getVariable(questionId, variableCache);
        var value = questionAnswer.value.toString();

        if (variablesToClear[variable.name])
            value = '';
        else
            value = clearMrvsJsonValue(value, variable.variableSetName, mrvsColumnsToClear);

        var copiedAnswer = new GlideRecord('question_answer');
        copiedAnswer.initialize();
        copiedAnswer.table_name = releaseTable;
        copiedAnswer.table_sys_id = newReleaseSysId;
        copiedAnswer.question = questionId;
        copiedAnswer.order = questionAnswer.order;
        copiedAnswer.value = value;

        if (copiedAnswer.isValidField('question_choice'))
            copiedAnswer.question_choice = variablesToClear[variable.name]
                ? ''
                : questionAnswer.question_choice;

        var copiedAnswerSysId = copiedAnswer.insert();
        copiedAnswerByOriginalId[questionAnswer.getUniqueValue()] = copiedAnswerSysId;
        copiedAnswerByQuestionId[questionId] = copiedAnswerSysId;
    }

    return {
        byOriginalId: copiedAnswerByOriginalId,
        byQuestionId: copiedAnswerByQuestionId
    };
}

function copyMultiRowAnswers(
    originalSysId,
    newReleaseSysId,
    releaseTable,
    copiedAnswers,
    variableCache,
    mrvsColumnsToClear
) {
    var originalAnswerIds = [];
    for (var copiedOriginalId in copiedAnswers.byOriginalId)
        originalAnswerIds.push(copiedOriginalId);

    var multiRowAnswer = new GlideRecord('sc_multi_row_question_answer');
    var query = multiRowAnswer.addQuery('parent_id', originalSysId);

    if (originalAnswerIds.length) {
        query.addOrCondition('parent_id', 'IN', originalAnswerIds.join(','));
        query.addOrCondition('question_answer', 'IN', originalAnswerIds.join(','));
    }

    multiRowAnswer.query();

    var mrvsParentAnswers = getMrvsParentAnswers(copiedAnswers.byQuestionId, variableCache);

    while (multiRowAnswer.next()) {
        var columnVariable = getVariable(
            multiRowAnswer.item_option_new.toString(),
            variableCache
        );
        var columnsToClear = mrvsColumnsToClear[columnVariable.variableSetName];
        var clearThisColumn = columnsToClear && columnsToClear[columnVariable.name];

        var copiedRow = new GlideRecord('sc_multi_row_question_answer');
        copiedRow.initialize();
        copiedRow.parent_table_name = releaseTable;
        copiedRow.variable_set = multiRowAnswer.variable_set;
        copiedRow.item_option_new = multiRowAnswer.item_option_new;
        copiedRow.row_index = multiRowAnswer.row_index;
        copiedRow.value = clearThisColumn ? '' : multiRowAnswer.value;

        if (copiedRow.isValidField('display_value'))
            copiedRow.display_value = clearThisColumn ? '' : multiRowAnswer.display_value;

        var originalParentId = multiRowAnswer.parent_id.toString();
        copiedRow.parent_id = originalParentId == originalSysId
            ? newReleaseSysId
            : (copiedAnswers.byOriginalId[originalParentId] || newReleaseSysId);

        var originalAnswerId = multiRowAnswer.question_answer.toString();
        var variableSetId = multiRowAnswer.variable_set.toString();
        copiedRow.question_answer =
            copiedAnswers.byOriginalId[originalAnswerId] ||
            mrvsParentAnswers.byVariableSet[variableSetId] ||
            mrvsParentAnswers.onlyMrvsParentId ||
            '';

        copiedRow.insert();
    }
}

function clearMrvsJsonValue(jsonValue, variableSetName, mrvsColumnsToClear) {
    if (!jsonValue || jsonValue.charAt(0) != '[')
        return jsonValue;

    try {
        var rows = JSON.parse(jsonValue);
        if (!rows || !rows.length)
            return jsonValue;

        var columns = mrvsColumnsToClear[variableSetName]
            || matchingClearColumns(rows[0], mrvsColumnsToClear);

        if (!columns)
            return jsonValue;

        for (var i = 0; i < rows.length; i++) {
            for (var columnName in columns) {
                if (rows[i].hasOwnProperty(columnName))
                    rows[i][columnName] = '';
            }
        }

        return JSON.stringify(rows);
    } catch (e) {
        return jsonValue;
    }
}

function matchingClearColumns(sampleRow, mrvsColumnsToClear) {
    var columns = {};
    var found = false;

    for (var variableSetName in mrvsColumnsToClear) {
        for (var columnName in mrvsColumnsToClear[variableSetName]) {
            if (sampleRow && sampleRow.hasOwnProperty(columnName)) {
                columns[columnName] = true;
                found = true;
            }
        }
    }

    return found ? columns : null;
}

function getMrvsParentAnswers(copiedAnswerByQuestionId, variableCache) {
    var byVariableSet = {};
    var mrvsParentIds = [];

    for (var questionId in copiedAnswerByQuestionId) {
        var variable = getVariable(questionId, variableCache);
        if (variable.type != '21')
            continue;

        var copiedAnswerSysId = copiedAnswerByQuestionId[questionId];
        if (variable.variableSetId)
            byVariableSet[variable.variableSetId] = copiedAnswerSysId;
        mrvsParentIds.push(copiedAnswerSysId);
    }

    return {
        byVariableSet: byVariableSet,
        onlyMrvsParentId: mrvsParentIds.length == 1 ? mrvsParentIds[0] : ''
    };
}

function getVariable(questionId, variableCache) {
    if (variableCache[questionId])
        return variableCache[questionId];

    var variable = {
        name: '',
        type: '',
        variableSetId: '',
        variableSetName: ''
    };

    var catalogVariable = new GlideRecord('item_option_new');
    if (catalogVariable.get(questionId)) {
        variable.name = catalogVariable.name.toString();
        variable.type = catalogVariable.type.toString();
        variable.variableSetId = catalogVariable.variable_set.toString();
        variable.variableSetName =
            catalogVariable.variable_set.internal_name.toString() ||
            catalogVariable.variable_set.name.toString();
    }

    variableCache[questionId] = variable;
    return variable;
}
