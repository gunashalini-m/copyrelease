/**
 * Copy Release — server-side UI Action on rm_release
 *
 * UI Action settings:
 *   Table: Release [rm_release]
 *   Client: false (unchecked)
 *   Form button: true
 *
 * Paste the IIFE below into the Script field (ServiceNow ES5).
 *
 * OMIT_* lists use catalog internal names:
 *   - item_option_new.name for variables / MRVS columns
 *   - item_option_new_set.internal_name for variable sets
 */
(function() {
    var TABLE = "rm_release";

    // Standalone (or any) variables to leave blank on the copy.
    var OMIT_VARIABLES = [
        // "release_manager",
        // "cab_approval"
    ];

    // Skip every variable in these sets (single-row sets and whole MRVS grids).
    var OMIT_VARIABLE_SETS = [
        // "agile_contact"
    ];

    // Skip only these columns; the rest of the set still copies.
    // Key = variable set internal name, value = column internal names.
    var OMIT_SET_COLUMNS = {
        // "agile_implementation_plan": ["planned_start_time", "planned_end_time"],
        // "agile_production_validation_plan": ["validator"]
    };

    var omitVarLookup = toLookup(OMIT_VARIABLES);
    var omitSetLookup = toLookup(OMIT_VARIABLE_SETS);
    var omitColLookup = {};
    for (var setName in OMIT_SET_COLUMNS) {
        omitColLookup[setName] = toLookup(OMIT_SET_COLUMNS[setName]);
    }

    var originalSysID = current.getUniqueValue();

    var newRelease = new GlideRecord(TABLE);
    newRelease.initialize();
    newRelease.setValue("short_description", "Copy of - " + current.getValue("short_description"));
    newRelease.setValue("description", current.getValue("description"));
    var newReleaseID = newRelease.insert();

    if (!newReleaseID) {
        gs.addErrorMessage("Failed to create the copied Release record.");
        return;
    }

    var qaSysIdMap = {};
    var questionToNewQa = {};
    var varMetaCache = {};
    var setMetaCache = {};

    copyProducedRecord(originalSysID, newReleaseID);
    copyQuestionAnswers(originalSysID, newReleaseID, qaSysIdMap, questionToNewQa);
    copyMrvsCells(originalSysID, newReleaseID, qaSysIdMap, questionToNewQa);
    rebuildMrvsJson(newReleaseID);

    gs.addInfoMessage("Release record successfully generated with fully populated variable grids.");
    action.setRedirectURL(newRelease);

    function toLookup(arr) {
        var o = {};
        if (!arr)
            return o;
        for (var i = 0; i < arr.length; i++)
            o[arr[i]] = true;
        return o;
    }

    function getVarMeta(questionId) {
        if (!questionId)
            return { name: "", setId: "", setName: "" };
        if (varMetaCache[questionId])
            return varMetaCache[questionId];

        var ion = new GlideRecord("item_option_new");
        var meta = { name: "", setId: "", setName: "" };
        if (ion.get(questionId)) {
            meta.name = ion.getValue("name") || "";
            meta.setId = ion.getValue("variable_set") || "";
            meta.setName = getSetInternalName(meta.setId);
        }
        varMetaCache[questionId] = meta;
        return meta;
    }

    function getSetInternalName(variableSetId) {
        if (!variableSetId)
            return "";
        if (setMetaCache[variableSetId])
            return setMetaCache[variableSetId];

        var vs = new GlideRecord("item_option_new_set");
        var name = "";
        if (vs.get(variableSetId))
            name = vs.getValue("internal_name") || vs.getValue("name") || "";
        setMetaCache[variableSetId] = name;
        return name;
    }

    function shouldOmitQuestion(questionId) {
        var meta = getVarMeta(questionId);
        if (meta.name && omitVarLookup[meta.name])
            return true;
        if (meta.setName && omitSetLookup[meta.setName])
            return true;
        return false;
    }

    function shouldOmitColumn(itemOptionNewId, variableSetId) {
        var colMeta = getVarMeta(itemOptionNewId);
        var setName = colMeta.setName || getSetInternalName(variableSetId);
        if (colMeta.name && omitVarLookup[colMeta.name])
            return true;
        if (setName && omitSetLookup[setName])
            return true;
        if (setName && omitColLookup[setName] && omitColLookup[setName][colMeta.name])
            return true;
        return false;
    }

    function copyProducedRecord(fromId, toId) {
        var src = new GlideRecord("sc_item_produced_record");
        var qc = src.addQuery("task", fromId);
        qc.addOrCondition("record_key", fromId);
        src.setLimit(1);
        src.query();
        if (!src.next())
            return;

        src.setValue("task", toId);
        src.setValue("record_key", toId);
        src.setValue("record_table", TABLE);
        src.insert();
    }

    function copyQuestionAnswers(fromId, toId, qaMap, questionMap) {
        var qaGR = new GlideRecord("question_answer");
        qaGR.addQuery("table_sys_id", fromId);
        qaGR.query();

        while (qaGR.next()) {
            var questionId = qaGR.getValue("question");
            if (shouldOmitQuestion(questionId))
                continue;

            var oldQaSysId = qaGR.getUniqueValue();
            var newQa = new GlideRecord("question_answer");
            newQa.initialize();
            newQa.setValue("table_name", TABLE);
            newQa.setValue("table_sys_id", toId);
            newQa.setValue("question", questionId);
            newQa.setValue("order", qaGR.getValue("order"));
            newQa.setValue("value", qaGR.getValue("value"));
            if (qaGR.isValidField("question_choice"))
                newQa.setValue("question_choice", qaGR.getValue("question_choice"));

            var newQaSysId = newQa.insert();
            qaMap[oldQaSysId] = newQaSysId;
            if (questionId)
                questionMap[questionId] = newQaSysId;
        }
    }

    function copyMrvsCells(fromId, toId, qaMap, questionMap) {
        var oldQaIds = [];
        for (var oldId in qaMap)
            oldQaIds.push(oldId);

        var mrvsGR = new GlideRecord("sc_multi_row_question_answer");
        var q = mrvsGR.addQuery("parent_id", fromId);
        if (oldQaIds.length) {
            var inList = oldQaIds.join(",");
            q.addOrCondition("parent_id", "IN", inList);
            q.addOrCondition("question_answer", "IN", inList);
        }
        mrvsGR.query();

        while (mrvsGR.next()) {
            var columnId = mrvsGR.getValue("item_option_new");
            var variableSetId = mrvsGR.getValue("variable_set");
            if (shouldOmitColumn(columnId, variableSetId))
                continue;

            var newMrvs = new GlideRecord("sc_multi_row_question_answer");
            newMrvs.initialize();
            newMrvs.setValue("parent_table_name", TABLE);
            newMrvs.setValue("variable_set", variableSetId);
            newMrvs.setValue("item_option_new", columnId);
            newMrvs.setValue("row_index", mrvsGR.getValue("row_index"));
            newMrvs.setValue("value", mrvsGR.getValue("value"));
            if (mrvsGR.isValidField("display_value"))
                newMrvs.setValue("display_value", mrvsGR.getValue("display_value"));

            var oldParent = mrvsGR.getValue("parent_id");
            if (oldParent === fromId)
                newMrvs.setValue("parent_id", toId);
            else if (qaMap[oldParent])
                newMrvs.setValue("parent_id", qaMap[oldParent]);
            else
                newMrvs.setValue("parent_id", toId);

            var oldQaLink = mrvsGR.getValue("question_answer");
            var newQaLink = "";
            if (oldQaLink && qaMap[oldQaLink])
                newQaLink = qaMap[oldQaLink];
            else
                newQaLink = resolveMrvsParentQa(variableSetId, questionMap);

            if (newQaLink)
                newMrvs.setValue("question_answer", newQaLink);

            newMrvs.insert();
        }
    }

    function resolveMrvsParentQa(variableSetId, questionMap) {
        if (!variableSetId)
            return "";

        for (var questionId in questionMap) {
            var ion = new GlideRecord("item_option_new");
            if (ion.get(questionId) && ion.getValue("variable_set") === variableSetId)
                return questionMap[questionId];
        }
        return "";
    }

    function rebuildMrvsJson(recordId) {
        var qaGR = new GlideRecord("question_answer");
        qaGR.addQuery("table_sys_id", recordId);
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
                var columnId = cells.getValue("item_option_new");
                var variableSetId = cells.getValue("variable_set");
                if (shouldOmitColumn(columnId, variableSetId))
                    continue;

                found = true;
                var idx = cells.getValue("row_index");
                if (!byRow[idx]) {
                    byRow[idx] = {};
                    order.push(idx);
                }
                var colName = "";
                if (cells.item_option_new && cells.item_option_new.name)
                    colName = cells.item_option_new.name.toString();
                if (colName)
                    byRow[idx][colName] = cells.getValue("value") || "";
            }

            if (!found)
                continue;

            var rows = [];
            for (var i = 0; i < order.length; i++)
                rows.push(byRow[order[i]]);

            qaGR.setValue("value", JSON.stringify(rows));
            qaGR.update();
        }
    }
})();
