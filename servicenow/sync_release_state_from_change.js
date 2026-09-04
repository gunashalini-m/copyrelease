/**
 * Sync Release state from Change state
 *
 * Business Rule on change_request:
 *   Name: Sync Release state from Change
 *   Table: Change Request [change_request]
 *   When: after
 *   Insert: true
 *   Update: true
 *   Filter: State changes OR Approval changes
 *
 * Paste syncLinkedReleases() downward into the Script field (ServiceNow ES5).
 *
 * Mapping (edit RELEASE_STATE / rules if your instance uses different choice values):
 *   Change New / Assess                         → Release Draft
 *   Change Authorize or Approval + not approved → Release Awaiting Approval
 *   Change Authorize + approved                 → Release Approved
 *   Change Scheduled                            → Release Scheduled
 *   Change Implement                            → Release Implementation
 *   Change Review                               → Release Review
 *   Change Closed                               → Release Closed Complete
 *   Change Canceled                             → Release Cancelled
 *
 * The mapping is a projection of the current Change snapshot. If the Change
 * moves backward (Scheduled → Authorize), the Release moves with it.
 *
 * Linked Releases are found by:
 *   1. rm_release.change_request = this Change
 *   2. change_request.parent = rm_release
 *   3. Record Producer variable named change_request on rm_release
 */
syncLinkedReleases();

function syncLinkedReleases() {
    var CHANGE_STATE = {
        "new": "-5",
        "assess": "-4",
        "authorize": "-3",
        "scheduled": "-2",
        "implement": "-1",
        "review": "0",
        "closed": "3",
        "canceled": "4"
    };

    var RELEASE_STATE = {
        "draft": "draft",
        "awaiting_approval": "awaiting_approval",
        "approved": "approved",
        "scheduled": "scheduled",
        "implementation": "implementation",
        "review": "review",
        "closed": "closed",
        "cancelled": "cancelled"
    };

    var changeState = String(current.getValue("state") || "");
    var changeApproval = String(current.getValue("approval") || "").toLowerCase();
    var changeStateDisplay = String(current.getDisplayValue("state") || "");
    var targetReleaseState = mapChangeToReleaseState(
        changeState,
        changeApproval,
        changeStateDisplay,
        CHANGE_STATE,
        RELEASE_STATE
    );

    if (!targetReleaseState) {
        return;
    }

    var releaseIds = {};
    collectDirectReleases(current, releaseIds);
    collectParentRelease(current, releaseIds);
    collectVariableLinkedReleases(current, releaseIds);

    var updated = 0;
    for (var releaseId in releaseIds) {
        if (applyReleaseState(releaseId, targetReleaseState))
            updated++;
    }

    if (updated > 0) {
        gs.info("Synced " + updated + " Release(s) to state " + targetReleaseState +
            " from Change " + current.getDisplayValue() +
            " (state=" + changeState + ", approval=" + changeApproval + ")");
    }
}

function mapChangeToReleaseState(changeState, changeApproval, changeStateDisplay, CHANGE_STATE, RELEASE_STATE) {
    var state = String(changeState);
    var approval = String(changeApproval || "").toLowerCase();
    var stateName = String(changeStateDisplay || "").toLowerCase();

    if (state === CHANGE_STATE.canceled || stateName === "canceled" || stateName === "cancelled")
        return RELEASE_STATE.cancelled;
    if (state === CHANGE_STATE.closed || stateName === "closed" || stateName.indexOf("closed") === 0)
        return RELEASE_STATE.closed;

    var inAuthorize = state === CHANGE_STATE.authorize ||
        stateName === "authorize" ||
        stateName === "authorization";
    var inApprovalState = stateName === "approval" || state === "approval";

    if (inAuthorize || inApprovalState) {
        if (approval === "approved" && inAuthorize && !inApprovalState)
            return RELEASE_STATE.approved;
        return RELEASE_STATE.awaiting_approval;
    }

    if (state === CHANGE_STATE.scheduled || stateName === "scheduled")
        return RELEASE_STATE.scheduled;
    if (state === CHANGE_STATE.implement || stateName === "implement" || stateName === "implementation")
        return RELEASE_STATE.implementation;
    if (state === CHANGE_STATE.review || stateName === "review")
        return RELEASE_STATE.review;
    if (state === CHANGE_STATE.assess || stateName === "assess")
        return RELEASE_STATE.draft;
    if (state === CHANGE_STATE["new"] || stateName === "new" || stateName === "pending")
        return RELEASE_STATE.draft;

    return null;
}

function collectDirectReleases(changeGr, releaseIds) {
    var rel = new GlideRecord("rm_release");
    rel.addQuery("change_request", changeGr.getUniqueValue());
    rel.query();
    while (rel.next())
        releaseIds[String(rel.getUniqueValue())] = true;
}

function collectParentRelease(changeGr, releaseIds) {
    var parentId = String(changeGr.getValue("parent") || "");
    if (!parentId)
        return;
    var rel = new GlideRecord("rm_release");
    if (rel.get(parentId))
        releaseIds[parentId] = true;
}

function collectVariableLinkedReleases(changeGr, releaseIds) {
    var qa = new GlideRecord("question_answer");
    qa.addQuery("table_name", "rm_release");
    qa.addQuery("value", changeGr.getUniqueValue());
    qa.addQuery("item.name", "change_request");
    qa.query();
    while (qa.next()) {
        var releaseId = String(qa.getValue("table_sys_id") || "");
        if (releaseId)
            releaseIds[releaseId] = true;
    }
}

function applyReleaseState(releaseId, targetState) {
    var rel = new GlideRecord("rm_release");
    if (!rel.get(releaseId))
        return false;
    if (String(rel.getValue("state") || "") === String(targetState))
        return false;
    rel.setValue("state", targetState);
    rel.update();
    return true;
}
