/**
 * Script Include
 *   Name: ReleaseChangeState
 *   Client callable: false
 *
 * Mapping lives here once. Both Business Rules call this class.
 *
 *   Change state / approval changes  → syncFromChange(current)
 *   Release parent set or cleared    → applyFromParent(current)  // before BR
 */
var ReleaseChangeState = Class.create();
ReleaseChangeState.prototype = {
    initialize: function() {
        this.RELEASE = {
            draft: "draft",
            awaiting_approval: "awaiting_approval",
            approved: "approved",
            scheduled: "scheduled",
            implementation: "implementation",
            review: "review",
            closed: "closed",
            cancelled: "cancelled"
        };
        this.CHANGE = {
            "new": "-5",
            assess: "-4",
            authorize: "-3",
            scheduled: "-2",
            implement: "-1",
            review: "0",
            closed: "3",
            canceled: "4"
        };
    },

    // After BR on change_request when state or approval changes.
    // One query: Releases whose parent is this Change.
    // setWorkflow(false) so the Release BR does not run again on those updates.
    syncFromChange: function(changeGr) {
        var target = this.stateForChange(changeGr);
        if (!target)
            return 0;

        var rel = new GlideRecord("rm_release");
        var q = rel.addQuery("parent", changeGr.getUniqueValue());
        q.addOrCondition("parent", changeGr.getValue("number"));
        rel.query();

        var n = 0;
        while (rel.next()) {
            if (!String(rel.getValue("parent") || ""))
                continue;
            if (String(rel.getValue("state") || "") === target)
                continue;
            rel.setWorkflow(false);
            rel.setValue("state", target);
            rel.update();
            n++;
        }
        return n;
    },

    // Before BR on rm_release when parent changes (and on insert).
    // Writes current.state in place — no extra GlideRecord.update.
    applyFromParent: function(releaseGr) {
        var parent = String(releaseGr.getValue("parent") || "").trim();
        if (!parent) {
            releaseGr.setValue("state", this.RELEASE.draft);
            return;
        }

        var chg = this._getChange(parent);
        if (!chg) {
            releaseGr.setValue("state", this.RELEASE.draft);
            return;
        }

        var target = this.stateForChange(chg);
        if (target)
            releaseGr.setValue("state", target);
    },

    stateForChange: function(changeGr) {
        return this.mapState(
            String(changeGr.getValue("state") || ""),
            String(changeGr.getValue("approval") || "").toLowerCase(),
            String(changeGr.getDisplayValue("state") || "").toLowerCase()
        );
    },

    mapState: function(state, approval, stateName) {
        var C = this.CHANGE;
        var R = this.RELEASE;
        var name = String(stateName || "");

        if (state === C.canceled || name === "canceled" || name === "cancelled")
            return R.cancelled;
        if (state === C.closed || name === "closed" || name.indexOf("closed") === 0)
            return R.closed;

        var authorize = state === C.authorize || name === "authorize" || name === "authorization";
        var approvalState = name === "approval" || state === "approval";
        if (authorize || approvalState)
            return approval === "approved" ? R.approved : R.awaiting_approval;

        if (state === C.scheduled || name === "scheduled")
            return R.scheduled;
        if (state === C.implement || name === "implement" || name === "implementation")
            return R.implementation;
        if (state === C.review || name === "review")
            return R.review;
        if (state === C.assess || name === "assess")
            return R.draft;
        if (state === C["new"] || name === "new" || name === "pending")
            return R.draft;

        return null;
    },

    _getChange: function(parent) {
        var chg = new GlideRecord("change_request");
        if (chg.get(parent))
            return chg;
        if (chg.get("number", parent))
            return chg;
        return null;
    },

    type: "ReleaseChangeState"
};
