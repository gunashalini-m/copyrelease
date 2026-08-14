/**
 * Copy Release — server-side UI Action on rm_release
 *
 * UI Action settings:
 *   Table: Release [rm_release]
 *   Client: false (unchecked)
 *   Form button: true
 *
 * Paste from copyReleaseRecord() downward into the Script field (ServiceNow ES5).
 * Do not wrap this in an extra IIFE. Nested functions inside an IIFE are not
 * always hoisted in Rhino, which aborted the script before insert().
 *
 * CLEAR_* lists: listed questions stay on the copy; values are left blank.
 */
copyReleaseRecord();

function copyReleaseRecord() {
    var TABLE = "rm_release";

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
        rebuildMrvsJson(ctx);
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
    var meta = { name: "", setId: "", setName: "" };
    if (!questionId)
        return meta;
    if (ctx.varMetaCache[questionId])
        return ctx.varMetaCache[questionId];

    var ion = new GlideRecord("item_option_new");
    if (ion.get(questionId)) {
        meta.name = ion.getValue("name") || "";
        meta.setId = ion.getValue("variable_set") || "";
        meta.setName = getSetInternalName(ctx, meta.setId);
    }
    ctx.varMetaCache[questionId] = meta;
    return meta;
}

function shouldClearQuestion(ctx, questionId) {
    var meta = getVarMeta(ctx, questionId);
    if (meta.name && ctx.clearVarLookup[meta.name])
        return true;
    if (meta.setName && ctx.clearSetLookup[meta.setName])
        return true;
    return false;
}

function shouldClearColumn(ctx, itemOptionNewId, variableSetId, oldQaLink, oldParent) {
    var colMeta = getVarMeta(ctx, itemOptionNewId);
    var setName = colMeta.setName || getSetInternalName(ctx, variableSetId);
    if (colMeta.name && ctx.clearVarLookup[colMeta.name])
        return true;
    if (setName && ctx.clearSetLookup[setName])
        return true;
    if (setName && ctx.clearColLookup[setName] && ctx.clearColLookup[setName][colMeta.name])
        return true;
    if (oldQaLink && ctx.blankQaIds[oldQaLink])
        return true;
    if (oldParent && ctx.blankQaIds[oldParent])
        return true;
    return false;
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
        var clearValue = shouldClearQuestion(ctx, questionId);
        if (clearValue)
            ctx.blankQaIds[oldQaSysId] = true;

        var newQa = new GlideRecord("question_answer");
        newQa.initialize();
        newQa.setValue("table_name", ctx.table);
        newQa.setValue("table_sys_id", ctx.toId);
        newQa.setValue("question", questionId);
        newQa.setValue("order", qaGR.getValue("order"));
        newQa.setValue("value", clearValue ? "" : qaGR.getValue("value"));
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
        var clearValue = shouldClearColumn(ctx, columnId, variableSetId, oldQaLink, oldParent);

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

function resolveMrvsParentQa(ctx, variableSetId) {
    if (!variableSetId)
        return "";

    for (var questionId in ctx.questionMap) {
        var meta = getVarMeta(ctx, questionId);
        if (meta.setId === variableSetId)
            return ctx.questionMap[questionId];
    }
    return "";
}

function rebuildMrvsJson(ctx) {
    var qaGR = new GlideRecord("question_answer");
    qaGR.addQuery("table_sys_id", ctx.toId);
    qaGR.query();

    while (qaGR.next()) {
        var qaId = qaGR.getUniqueValue();
        var cells = new GlideRecord("sc_multi_row_question_answer");
        var cq = cells.addQuery("question_answer", qaId);
        cq.addOrCondition("parent_id", qaId);
        cells.orderBy("row_index");
        cells.query();

        var byRow = {};
        var order = [];
        var found = false;

        while (cells.next()) {
            found = true;
            var idx = cells.getValue("row_index");
            if (!byRow[idx]) {
                byRow[idx] = {};
                order.push(idx);
            }
            var colMeta = getVarMeta(ctx, cells.getValue("item_option_new"));
            if (colMeta.name)
                byRow[idx][colMeta.name] = cells.getValue("value") || "";
        }

        if (!found)
            continue;

        var rows = [];
        for (var i = 0; i < order.length; i++)
            rows.push(byRow[order[i]]);

        qaGR.setValue("value", stringifyJson(rows));
        qaGR.update();
    }
}

function stringifyJson(obj) {
    if (typeof JSON !== "undefined" && JSON.stringify)
        return JSON.stringify(obj);
    return new JSON().encode(obj);
}
