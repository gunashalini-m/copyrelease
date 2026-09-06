/**
 * Business Rule: Sync Release state from Change
 * Table: Change Request [change_request]
 * When: after insert / after update
 * Filter: State changes
 *
 * Decision Table: Release to Change state mapping
 * sys_id: e914679bc34b4350dfef35a60501311b
 *
 * One input:  Change State  (choice on change_request.state)
 * One result: Release State (choice on rm_release.state)
 *
 * Paste this whole script into the Script field.
 */
(function executeRule(current, previous) {
    var DECISION_TABLE = "e914679bc34b4350dfef35a60501311b";

    var stateValue = String(current.getValue("state") || "");
    var stateLabel = String(current.getDisplayValue("state") || "");
    var releaseState = releaseStateFromDecision(DECISION_TABLE, stateValue, stateLabel);

    if (!releaseState) {
        gs.info("No Release state mapped for Change " + current.getDisplayValue() +
            " (state=" + stateValue + " " + stateLabel + ")");
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
        if (String(release.getValue("state") || "") === String(releaseState))
            continue;

        gs.info("Updating Release " + release.getDisplayValue() +
            " from " + release.getValue("state") + " to " + releaseState);

        release.setWorkflow(false);
        release.setValue("state", releaseState);
        release.update();
    }
})(current, previous);

function releaseStateFromDecision(tableId, stateValue, stateLabel) {
    var dt = new sn_dt.DecisionTableAPI();
    var tries = [
        { u_change_state: stateValue },
        { change_state: stateValue },
        { u_change_state: stateLabel },
        { change_state: stateLabel }
    ];

    for (var i = 0; i < tries.length; i++) {
        var response = dt.getDecision(tableId, tries[i]);
        var value = readReleaseState(response);
        if (value)
            return value;
    }
    return null;
}

function readReleaseState(response) {
    if (!response || !response.result_elements)
        return null;

    var el = response.result_elements;
    var names = ["u_release_state", "release_state"];
    for (var i = 0; i < names.length; i++) {
        var v = glideVal(el[names[i]]);
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
    if (typeof element.getDisplayValue === "function")
        return String(element.getDisplayValue() || "");
    return String(element);
}
