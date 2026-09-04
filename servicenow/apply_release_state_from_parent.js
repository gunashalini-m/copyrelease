/**
 * Business Rule 2 — Release
 * Table: Release [rm_release]
 * When: before insert / before update
 * Condition: Parent changes (also run on insert)
 *
 * The only Change we look at is rm_release.parent (Change number or sys_id).
 * If parent is empty, the Release stays in Draft.
 *
 * Paste from applyStateFromParentChange() down into the Script field.
 */
applyStateFromParentChange();

function applyStateFromParentChange() {
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

    var parent = String(current.getValue("parent") || "").trim();
    if (!parent) {
        current.setValue("state", RELEASE.draft);
        return;
    }

    var chg = new GlideRecord("change_request");
    var found = chg.get(parent);
    if (!found)
        found = chg.get("number", parent);
    if (!found) {
        current.setValue("state", RELEASE.draft);
        return;
    }

    var target = releaseStateForParentChange(
        String(chg.getValue("state") || ""),
        String(chg.getValue("approval") || "").toLowerCase(),
        String(chg.getDisplayValue("state") || "").toLowerCase(),
        RELEASE
    );
    if (target)
        current.setValue("state", target);
}

function releaseStateForParentChange(state, approval, stateName, RELEASE) {
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
