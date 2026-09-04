/**
 * Business Rule 1 — Change Request
 * Table: Change Request [change_request]
 * When: after insert / after update
 * Condition: State changes OR Approval changes
 *
 * Only Releases whose parent is this Change (number or sys_id) are updated.
 *
 * Paste from syncReleasesForThisChange() down into the Script field.
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
 * Always map from this Change as it is now. If it goes back a step, the
 * Release goes back too.
 */
syncReleasesForThisChange();

function syncReleasesForThisChange() {
    var RELEASE = releaseChoices();
    var target = releaseStateForChange(
        String(current.getValue("state") || ""),
        String(current.getValue("approval") || "").toLowerCase(),
        String(current.getDisplayValue("state") || "").toLowerCase(),
        RELEASE
    );
    if (!target)
        return;

    var rel = new GlideRecord("rm_release");
    var q = rel.addQuery("parent", current.getUniqueValue());
    q.addOrCondition("parent", current.getValue("number"));
    rel.query();

    var n = 0;
    while (rel.next()) {
        if (String(rel.getValue("parent") || "") === "")
            continue;
        if (setReleaseState(rel, target))
            n++;
    }

    if (n > 0)
        gs.info("Set " + n + " Release(s) to " + target + " from parent Change " +
            current.getDisplayValue() + " (state=" + current.getValue("state") +
            ", approval=" + current.getValue("approval") + ")");
}

function releaseChoices() {
    // Match these to rm_release.state on your instance.
    return {
        "draft": "draft",
        "awaiting_approval": "awaiting_approval",
        "approved": "approved",
        "scheduled": "scheduled",
        "implementation": "implementation",
        "review": "review",
        "closed": "closed",
        "cancelled": "cancelled"
    };
}

function changeChoices() {
    return {
        "new": "-5",
        "assess": "-4",
        "authorize": "-3",
        "scheduled": "-2",
        "implement": "-1",
        "review": "0",
        "closed": "3",
        "canceled": "4"
    };
}

function releaseStateForChange(state, approval, stateName, RELEASE) {
    var CHANGE = changeChoices();
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

function setReleaseState(rel, target) {
    if (String(rel.getValue("state") || "") === String(target))
        return false;
    rel.setValue("state", target);
    rel.update();
    return true;
}
