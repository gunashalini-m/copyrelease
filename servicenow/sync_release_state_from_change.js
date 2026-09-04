/**
 * Business Rule: Sync Release state from Change
 * Table: Change Request [change_request]
 * When: after insert / after update
 * Condition: State changes OR Approval changes
 *
 * Paste from syncLinkedReleases() down into the Script field.
 *
 * Mapping:
 *   New / Assess                              → Draft
 *   Authorize or Approval, not yet approved   → Awaiting Approval
 *   Authorize or Approval, approved           → Approved
 *   Scheduled                                 → Scheduled
 *   Implement                                 → Implementation
 *   Review                                    → Review
 *   Closed                                    → Closed Complete
 *   Canceled                                  → Cancelled
 *
 * Always map from the current Change. If it goes back a step, the Release
 * goes back too.
 */
syncLinkedReleases();

function syncLinkedReleases() {
    var CHANGE = {
        "new": "-5",
        "assess": "-4",
        "authorize": "-3",
        "scheduled": "-2",
        "implement": "-1",
        "review": "0",
        "closed": "3",
        "canceled": "4"
    };

    // Match these to rm_release.state on your instance.
    var RELEASE = {
        "draft": "draft",
        "awaiting_approval": "awaiting_approval",
        "approved": "approved",
        "scheduled": "scheduled",
        "implementation": "implementation",
        "review": "review",
        "closed": "closed",
        "cancelled": "cancelled"
    };

    var state = String(current.getValue("state") || "");
    var approval = String(current.getValue("approval") || "").toLowerCase();
    var stateName = String(current.getDisplayValue("state") || "").toLowerCase();
    var target = releaseStateForChange(state, approval, stateName, CHANGE, RELEASE);
    if (!target)
        return;

    var ids = {};
    findReleasesByChangeField(current, ids);
    findReleaseParent(current, ids);
    findReleasesByVariable(current, ids);

    var n = 0;
    for (var id in ids) {
        if (setReleaseState(id, target))
            n++;
    }

    if (n > 0)
        gs.info("Release state set to " + target + " from Change " + current.getDisplayValue() +
            " (state=" + state + ", approval=" + approval + ")");
}

function releaseStateForChange(state, approval, stateName, CHANGE, RELEASE) {
    var name = String(stateName || "");

    if (state === CHANGE.canceled || name === "canceled" || name === "cancelled")
        return RELEASE.cancelled;
    if (state === CHANGE.closed || name === "closed" || name.indexOf("closed") === 0)
        return RELEASE.closed;

    var authorize = state === CHANGE.authorize || name === "authorize" || name === "authorization";
    var approvalState = name === "approval" || state === "approval";

    if (authorize || approvalState) {
        if (approval === "approved")
            return RELEASE.approved;
        return RELEASE.awaiting_approval;
    }

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

function findReleasesByChangeField(changeGr, ids) {
    var rel = new GlideRecord("rm_release");
    rel.addQuery("change_request", changeGr.getUniqueValue());
    rel.query();
    while (rel.next())
        ids[String(rel.getUniqueValue())] = true;
}

function findReleaseParent(changeGr, ids) {
    var parentId = String(changeGr.getValue("parent") || "");
    if (!parentId)
        return;
    var rel = new GlideRecord("rm_release");
    if (rel.get(parentId))
        ids[parentId] = true;
}

function findReleasesByVariable(changeGr, ids) {
    var qa = new GlideRecord("question_answer");
    qa.addQuery("table_name", "rm_release");
    qa.addQuery("value", changeGr.getUniqueValue());
    qa.addQuery("item.name", "change_request");
    qa.query();
    while (qa.next()) {
        var releaseId = String(qa.getValue("table_sys_id") || "");
        if (releaseId)
            ids[releaseId] = true;
    }
}

function setReleaseState(releaseId, target) {
    var rel = new GlideRecord("rm_release");
    if (!rel.get(releaseId))
        return false;
    if (String(rel.getValue("state") || "") === String(target))
        return false;
    rel.setValue("state", target);
    rel.update();
    return true;
}
