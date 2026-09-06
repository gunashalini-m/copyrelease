/**
 * Business Rule: Sync Release state from Change
 * Table: Change Request [change_request]
 * When: after insert / after update
 * Filter: State changes OR Approval changes
 *
 * Paste this whole script into the Script field.
 *
 * Decision Table columns (Workflow Studio):
 *   Change State     → u_change_state      (value, e.g. -3)
 *   Change Approval  → u_change_approval   (requested / approved / …)
 *   Release State    → u_release_state
 *
 * Set DECISION_TABLE_SYS_ID, or DECISION_TABLE_NAME to match the table.
 * If the table has no matching row, the script falls back to the built-in map.
 */
(function executeRule(current, previous) {
    var DECISION_TABLE_SYS_ID = "";
    var DECISION_TABLE_NAME = "Change to Release State";

    var changeState = String(current.getValue("state") || "");
    var changeApproval = String(current.getValue("approval") || "");
    var releaseState = stateFromDecision(changeState, changeApproval,
        DECISION_TABLE_SYS_ID, DECISION_TABLE_NAME);

    if (!releaseState)
        releaseState = stateFromMap(changeState, changeApproval,
            String(current.getDisplayValue("state") || "").toLowerCase());

    if (!releaseState) {
        gs.info("No Release state mapped for Change " + current.getDisplayValue() +
            " (state=" + changeState + ", approval=" + changeApproval + ")");
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

        gs.info("Updating Release " + release.getDisplayValue() +
            " from " + release.getValue("state") + " to " + releaseState);

        release.setWorkflow(false);
        release.setValue("state", releaseState);
        release.update();
    }
})(current, previous);

function stateFromDecision(changeState, changeApproval, tableSysId, tableName) {
    var id = tableSysId;
    if (!id)
        id = findDecisionTableId(tableName);
    if (!id)
        return null;

    var dt = new sn_dt.DecisionTableAPI();
    var attempts = [
        { u_change_state: changeState, u_change_approval: changeApproval },
        { u_change_state: changeState }
    ];

    for (var i = 0; i < attempts.length; i++) {
        var response = dt.getDecision(id, attempts[i]);
        var value = readReleaseAnswer(response);
        if (value)
            return value;
    }
    return null;
}

function findDecisionTableId(name) {
    if (!name)
        return null;
    var gr = new GlideRecord("sys_decision");
    gr.addQuery("name", name);
    gr.query();
    if (gr.next())
        return gr.getUniqueValue();
    return null;
}

function readReleaseAnswer(response) {
    if (!response || !response.result_elements)
        return null;

    var el = response.result_elements;
    var names = ["u_release_state", "release_state", "u_release", "release"];
    for (var i = 0; i < names.length; i++) {
        var v = glideVal(el[names[i]]);
        if (v)
            return v;
    }
    for (var key in el) {
        if (!el.hasOwnProperty(key))
            continue;
        if (String(key).toLowerCase().indexOf("release") === -1)
            continue;
        v = glideVal(el[key]);
        if (v)
            return v;
    }
    return null;
}

function glideVal(element) {
    if (element == null || element === undefined)
        return "";
    if (typeof element.getValue === "function")
        return String(element.getValue() || "");
    if (typeof element.getDisplayValue === "function") {
        var d = String(element.getDisplayValue() || "");
        if (d)
            return d;
    }
    return String(element);
}

function stateFromMap(state, approval, stateName) {
    var CHANGE = {
        "new": "-5",
        assess: "-4",
        authorize: "-3",
        scheduled: "-2",
        implement: "-1",
        review: "0",
        closed: "3",
        canceled: "4"
    };
    var RELEASE = {
        draft: "draft",
        awaiting_approval: "awaiting_approval",
        approved: "approved",
        scheduled: "scheduled",
        implementation: "implementation",
        review: "review",
        closed: "closed",
        cancelled: "cancelled"
    };
    var name = String(stateName || "");
    approval = String(approval || "").toLowerCase();

    if (state === CHANGE.canceled || name === "canceled" || name === "cancelled")
        return RELEASE.cancelled;
    if (state === CHANGE.closed || name === "closed" || name.indexOf("closed") === 0)
        return RELEASE.closed;

    var authorize = state === CHANGE.authorize || name === "authorize" || name === "authorization";
    var approvalState = name === "approval" || state === "approval";
    if (authorize || approvalState)
        return approval === "approved" ? RELEASE.approved : RELEASE.awaiting_approval;

    if (state === CHANGE.scheduled || name === "scheduled")
        return RELEASE.scheduled;
    if (state === CHANGE.implement || name === "implement" || name === "implementation")
        return RELEASE.implementation;
    if (state === CHANGE.review || name === "review")
        return RELEASE.review;
    if (state === CHANGE.assess || name === "assess")
        return RELEASE.draft;
    if (state === CHANGE["new"] || name === "new" || name === "pending")
        return RELEASE.draft;

    return null;
}
