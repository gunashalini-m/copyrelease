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
 * Why the original script left MRVS grids empty ("No data to display"):
 * 1. Assigning GlideElements (qaGR.value) does not copy MRVS JSON; use getValue/setValue.
 * 2. sc_multi_row_question_answer.parent_id is often the MRVS question_answer sys_id,
 *    not the release sys_id — querying only the release sys_id copied zero cell rows.
 * 3. Cell rows must remap question_answer (and parent_id when it points at a QA record).
 * 4. sc_item_produced_record.task must be set or the Variable Editor will not render MRVS as a table.
 * 5. The MRVS formatter reads question_answer.value JSON; rebuild it after the cell copy.
 */
(function() {
    var TABLE = "rm_release";
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

    copyProducedRecord(originalSysID, newReleaseID);
    copyQuestionAnswers(originalSysID, newReleaseID, qaSysIdMap, questionToNewQa);
    copyMrvsCells(originalSysID, newReleaseID, qaSysIdMap, questionToNewQa);
    rebuildMrvsJson(newReleaseID);

    gs.addInfoMessage("Release record successfully generated with fully populated variable grids.");
    action.setRedirectURL(newRelease);

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
            var oldQaSysId = qaGR.getUniqueValue();
            var questionId = qaGR.getValue("question");

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
            var newMrvs = new GlideRecord("sc_multi_row_question_answer");
            newMrvs.initialize();
            newMrvs.setValue("parent_table_name", TABLE);
            newMrvs.setValue("variable_set", mrvsGR.getValue("variable_set"));
            newMrvs.setValue("item_option_new", mrvsGR.getValue("item_option_new"));
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
                newQaLink = resolveMrvsParentQa(mrvsGR.getValue("variable_set"), questionMap);

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
