/**
 * Business Rule: Sync Release state from Change
 * Table: Change Request [change_request]
 * When: after insert / after update
 * Filter: State changes OR Approval changes
 *
 * Paste into the Script field. Mapping is Decision Table via
 * Script Include ReleaseChangeState.
 *
 * If you want this rule standalone (no Script Include), use the
 * block at the bottom instead — same DecisionTableAPI usage.
 */
new ReleaseChangeState().syncFromChange(current);

/*
Standalone version (same API fixes). Uncomment and delete the line above
if you are not using the Script Include.

(function executeRule(current, previous) {
    var DECISION_TABLE = "YOUR_DECISION_TABLE_SYS_ID";

    var dt = new sn_dt.DecisionTableAPI();
    var inputs = {};
    inputs.u_change_state = String(current.getValue("state") || "");
    inputs.u_change_approval = String(current.getValue("approval") || "");

    var response = dt.getDecision(DECISION_TABLE, inputs);

    // Do not JSON.stringify(response). result_elements are GlideElements
    // and stringify shows empty even when a row matched.
    if (!response || !response.result_elements) {
        gs.info("No decision for Change " + current.getDisplayValue() +
            " state=" + current.getValue("state") +
            " approval=" + current.getValue("approval"));
        return;
    }

    var answer = response.result_elements.u_release_state;
    var releaseState = answer && answer.getValue ? String(answer.getValue()) : "";
    if (!releaseState) {
        gs.info("Decision matched but u_release_state was empty");
        return;
    }

    gs.info("Mapped Release State: " + releaseState);

    var release = new GlideRecord("rm_release");
    var q = release.addQuery("parent", current.getUniqueValue());
    q.addOrCondition("parent", current.getValue("number"));
    release.query();

    while (release.next()) {
        if (!String(release.getValue("parent") || ""))
            continue;
        if (String(release.getValue("state") || "") === releaseState)
            continue;
        release.setWorkflow(false);
        release.setValue("state", releaseState);
        release.update();
    }
})(current, previous);
*/
