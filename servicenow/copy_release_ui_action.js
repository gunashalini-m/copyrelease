/**
 * Copy Release — server-side UI Action on rm_release
 *
 * UI Action settings:
 *   Table: Release [rm_release]
 *   Client: false (unchecked)
 *   Form button: true
 *
 * Paste from copyReleaseRecord() downward into the Script field (ServiceNow ES5).
 * Use GlideRecord.setValue (not g_form.setValue) — this script runs on the server.
 *
 * Type 21 is only used to find the MRVS parent question_answer.
 * Values are never cleared because a variable is type 21.
 * MRVS cells are cleared by column name in CLEAR_SET_COLUMNS
 * (variable name inside the variable set).
 *
 * CLEAR_* lists: listed questions stay on the copy; values are left blank.
 */
copyReleaseRecord();

function copyReleaseRecord() {
    var TABLE = "rm_release";
    var TYPE_MRVS = "21";

    var CLEAR_VARIABLES = [
        "change_request"
    ];
    var CLEAR_VARIABLE_SETS = [];
    var CLEAR_SET_COLUMNS = {
        "u_agile_implementation_plan": ["planned_start_time", "planned_end_time"]
    };

    var originalSysID = current.getUniqueValue();
    var newRelease = new GlideRecord(TABLE);
    newRelease.initialize();
    newRelease.setValue("short_description", "Copy of - " + String(current.getValue("short_description") || ""));
    newRelease.setValue("description", current.getValue("description"));
    var newReleaseID = newRelease.insert();

    if (!newReleaseID) {
        gs.addErrorMessage("Failed to create the copied Release record.");
        return;
    }

    action.setRedirectURL(newRelease);

    try {
        var ctx = {
            table: TABLE,
            typeMrvs: TYPE_MRVS,
            fromId: originalSysID,
            toId: newReleaseID,
            qaMap: {},
            questionMap: {},
            blankQaIds: {},
            varMetaCache: {},
            setMetaCache: {},
            clearVarLookup: toLookup(CLEAR_VARIABLES),
            clearSetLookup: toLookup(CLEAR_VARIABLE_SETS),
            clearColLookup: {}
        };
        for (var setName in CLEAR_SET_COLUMNS)
            ctx.clearColLookup[setName] = toLookup(CLEAR_SET_COLUMNS[setName]);

        copyProducedRecord(ctx);
        copyQuestionAnswers(ctx);
        copyMrvsCells(ctx);
        gs.addInfoMessage("Release record successfully generated with fully populated variable grids.");
    } catch (e) {
        gs.addErrorMessage("Release was created, but variable copy failed: " + e);
        gs.error("Copy Release variable copy failed: " + e);
    }
}

function toLookup(arr) {
    var o = {};
    if (!arr)
        return o;
    for (var i = 0; i < arr.length; i++)
        o[arr[i]] = true;
    return o;
}

function getSetInternalName(ctx, variableSetId) {
    if (!variableSetId)
        return "";
    if (ctx.setMetaCache[variableSetId])
        return ctx.setMetaCache[variableSetId];

    var name = "";
    var vs = new GlideRecord("item_option_new_set");
    if (vs.get(variableSetId)) {
        if (vs.isValidField("internal_name"))
            name = vs.getValue("internal_name") || "";
        if (!name)
            name = vs.getValue("name") || "";
    }
    ctx.setMetaCache[variableSetId] = name;
    return name;
}

function getVarMeta(ctx, questionId) {
    var meta = { name: "", type: "", setId: "", setName: "" };
    if (!questionId)
        return meta;
    if (ctx.varMetaCache[questionId])
        return ctx.varMetaCache[questionId];

    var ion = new GlideRecord("item_option_new");
    if (ion.get(questionId)) {
        meta.name = ion.getValue("name") || "";
        meta.type = ion.getValue("type") || "";
        meta.setId = ion.getValue("variable_set") || "";
        meta.setName = getSetInternalName(ctx, meta.setId);
    }
    ctx.varMetaCache[questionId] = meta;
    return meta;
}

function isMrvsVariable(ctx, meta) {
    return meta && meta.type == ctx.typeMrvs;
}

function shouldClearQuestion(ctx, questionId) {
    var meta = getVarMeta(ctx, questionId);
    if (isMrvsVariable(ctx, meta))
        return false;
    if (meta.name && ctx.clearVarLookup[meta.name])
        return true;
    if (meta.setName && ctx.clearSetLookup[meta.setName])
        return true;
    return false;
}

function shouldClearColumn(ctx, itemOptionNewId, variableSetId) {
    var colMeta = getVarMeta(ctx, itemOptionNewId);
    var setName = colMeta.setName || getSetInternalName(ctx, variableSetId);
    if (setName && ctx.clearSetLookup[setName])
        return true;
    return listedColumnForSet(ctx, setName, colMeta.name);
}

function listedColumnForSet(ctx, setOrQuestionName, columnName) {
    if (!setOrQuestionName || !columnName || !ctx.clearColLookup[setOrQuestionName])
        return false;
    return ctx.clearColLookup[setOrQuestionName][columnName] === true;
}

function copyProducedRecord(ctx) {
    var src = new GlideRecord("sc_item_produced_record");
    var qc = src.addQuery("task", ctx.fromId);
    qc.addOrCondition("record_key", ctx.fromId);
    src.setLimit(1);
    src.query();
    if (!src.next())
        return;

    var dest = new GlideRecord("sc_item_produced_record");
    dest.initialize();
    dest.setValue("producer", src.getValue("producer"));
    dest.setValue("record_table", ctx.table);
    dest.setValue("task", ctx.toId);
    dest.setValue("record_key", ctx.toId);
    dest.insert();
}

function copyQuestionAnswers(ctx) {
    var qaGR = new GlideRecord("question_answer");
    qaGR.addQuery("table_sys_id", ctx.fromId);
    qaGR.query();

    while (qaGR.next()) {
        var questionId = qaGR.getValue("question");
        var oldQaSysId = qaGR.getUniqueValue();
        var meta = getVarMeta(ctx, questionId);
        var clearValue = shouldClearQuestion(ctx, questionId);
        if (clearValue)
            ctx.blankQaIds[oldQaSysId] = true;

        var value = qaGR.getValue("value");
        if (clearValue)
            value = "";
        else
            value = blankListedMrvsColumns(ctx, meta, value);

        var newQa = new GlideRecord("question_answer");
        newQa.initialize();
        newQa.setValue("table_name", ctx.table);
        newQa.setValue("table_sys_id", ctx.toId);
        newQa.setValue("question", questionId);
        newQa.setValue("order", qaGR.getValue("order"));
        newQa.setValue("value", value);
        if (qaGR.isValidField("question_choice"))
            newQa.setValue("question_choice", clearValue ? "" : qaGR.getValue("question_choice"));

        var newQaSysId = newQa.insert();
        ctx.qaMap[oldQaSysId] = newQaSysId;
        if (questionId)
            ctx.questionMap[questionId] = newQaSysId;
    }
}

function copyMrvsCells(ctx) {
    var oldQaIds = [];
    for (var oldId in ctx.qaMap)
        oldQaIds.push(oldId);

    var mrvsGR = new GlideRecord("sc_multi_row_question_answer");
    var q = mrvsGR.addQuery("parent_id", ctx.fromId);
    if (oldQaIds.length) {
        var inList = oldQaIds.join(",");
        q.addOrCondition("parent_id", "IN", inList);
        q.addOrCondition("question_answer", "IN", inList);
    }
    mrvsGR.query();

    while (mrvsGR.next()) {
        var columnId = mrvsGR.getValue("item_option_new");
        var variableSetId = mrvsGR.getValue("variable_set");
        var oldParent = mrvsGR.getValue("parent_id");
        var oldQaLink = mrvsGR.getValue("question_answer");
        var clearValue = shouldClearColumn(ctx, columnId, variableSetId);

        var newMrvs = new GlideRecord("sc_multi_row_question_answer");
        newMrvs.initialize();
        newMrvs.setValue("parent_table_name", ctx.table);
        newMrvs.setValue("variable_set", variableSetId);
        newMrvs.setValue("item_option_new", columnId);
        newMrvs.setValue("row_index", mrvsGR.getValue("row_index"));
        newMrvs.setValue("value", clearValue ? "" : mrvsGR.getValue("value"));
        if (mrvsGR.isValidField("display_value"))
            newMrvs.setValue("display_value", clearValue ? "" : mrvsGR.getValue("display_value"));

        if (oldParent === ctx.fromId)
            newMrvs.setValue("parent_id", ctx.toId);
        else if (ctx.qaMap[oldParent])
            newMrvs.setValue("parent_id", ctx.qaMap[oldParent]);
        else
            newMrvs.setValue("parent_id", ctx.toId);

        var newQaLink = "";
        if (oldQaLink && ctx.qaMap[oldQaLink])
            newQaLink = ctx.qaMap[oldQaLink];
        else
            newQaLink = resolveMrvsParentQa(ctx, variableSetId);

        if (newQaLink)
            newMrvs.setValue("question_answer", newQaLink);

        newMrvs.insert();
    }
}

function blankListedMrvsColumns(ctx, meta, value) {
    if (!value || value.indexOf("[") !== 0)
        return value;

    try {
        var rows = parseJson(value);
        if (!rows || typeof rows.length === "undefined")
            return value;

        var colLookup = ctx.clearColLookup[meta.setName] || ctx.clearColLookup[meta.name];
        if (!colLookup)
            colLookup = columnsMatchingRow(ctx, rows[0]);
        if (!colLookup)
            return value;

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            for (var columnName in colLookup) {
                if (row && row.hasOwnProperty(columnName))
                    row[columnName] = "";
            }
        }
        return stringifyJson(rows);
    } catch (e) {
        return value;
    }
}

function columnsMatchingRow(ctx, sampleRow) {
    var lookup = {};
    var found = false;
    if (!sampleRow)
        return null;
    for (var setName in ctx.clearColLookup) {
        for (var columnName in ctx.clearColLookup[setName]) {
            if (sampleRow.hasOwnProperty(columnName)) {
                lookup[columnName] = true;
                found = true;
            }
        }
    }
    return found ? lookup : null;
}

function parseJson(str) {
    if (typeof JSON !== "undefined" && JSON.parse)
        return JSON.parse(str);
    return new JSON().decode(str);
}

function stringifyJson(obj) {
    if (typeof JSON !== "undefined" && JSON.stringify)
        return JSON.stringify(obj);
    return new JSON().encode(obj);
}

function resolveMrvsParentQa(ctx, variableSetId) {
    var fallback = "";
    var type21Count = 0;

    for (var questionId in ctx.questionMap) {
        var meta = getVarMeta(ctx, questionId);
        if (!isMrvsVariable(ctx, meta))
            continue;

        if (variableSetId && meta.setId === variableSetId)
            return ctx.questionMap[questionId];

        fallback = ctx.questionMap[questionId];
        type21Count++;
    }

    return type21Count == 1 ? fallback : "";
}
