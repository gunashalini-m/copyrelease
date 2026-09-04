/**
 * One Business Rule on Change Request [change_request]
 * When: after insert / after update
 * Condition: State changes OR Approval changes
 *
 * A BR belongs to one table. Change state lives here, so this is the rule.
 * Releases are found only by parent = this Change (sys_id or number).
 * No parent means the Release is not in that query, so this script never
 * moves it — it stays Draft.
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
        var parent = String(rel.getValue("parent") || "");
        if (!parent)
            continue;
        if (String(rel.getValue("state") || "") === target)
            continue;
        rel.setValue("state", target);
        rel.update();
        n++;
    }

    if (n > 0)
        gs.info("Set " + n + " Release(s) to " + target + " from parent Change " +
            current.getDisplayValue());
}

function releaseStateForChange(state, approval, stateName, RELEASE) {
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
    var name = String(stateName || "");

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
