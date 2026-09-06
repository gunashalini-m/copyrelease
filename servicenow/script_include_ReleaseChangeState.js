/**
 * Script Include
 *   Name: ReleaseChangeState
 *   Client callable: false
 *
 * Used by the Release before-rule (parent empty → Draft).
 * Change after-rule can call syncFromChange, or paste
 * sync_release_state_from_change.js as a standalone script.
 */
var ReleaseChangeState = Class.create();
ReleaseChangeState.prototype = {
    initialize: function() {
        this.DECISION_TABLE_SYS_ID = "";
        this.DECISION_TABLE_NAME = "Change to Release State";
        this.RELEASE = { draft: "draft" };
    },

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
        var changeState = String(changeGr.getValue("state") || "");
        var changeApproval = String(changeGr.getValue("approval") || "");
        var fromDt = this.stateFromDecision(changeState, changeApproval);
        if (fromDt)
            return fromDt;
        return this.stateFromMap(
            changeState,
            changeApproval,
            String(changeGr.getDisplayValue("state") || "").toLowerCase()
        );
    },

    stateFromDecision: function(changeState, changeApproval) {
        var id = this.DECISION_TABLE_SYS_ID;
        if (!id)
            id = this._findDecisionTableId(this.DECISION_TABLE_NAME);
        if (!id)
            return null;

        var dt = new sn_dt.DecisionTableAPI();
        var attempts = [
            { u_change_state: changeState, u_change_approval: changeApproval },
            { u_change_state: changeState }
        ];

        for (var i = 0; i < attempts.length; i++) {
            var response = dt.getDecision(id, attempts[i]);
            var value = this._readReleaseAnswer(response);
            if (value)
                return value;
        }
        return null;
    },

    stateFromMap: function(state, approval, stateName) {
        var C = {
            "new": "-5",
            assess: "-4",
            authorize: "-3",
            scheduled: "-2",
            implement: "-1",
            review: "0",
            closed: "3",
            canceled: "4"
        };
        var R = {
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

    _findDecisionTableId: function(name) {
        if (!name)
            return null;
        var gr = new GlideRecord("sys_decision");
        gr.addQuery("name", name);
        gr.query();
        if (gr.next())
            return gr.getUniqueValue();
        return null;
    },

    _readReleaseAnswer: function(response) {
        if (!response || !response.result_elements)
            return null;
        var el = response.result_elements;
        var names = ["u_release_state", "release_state", "u_release", "release"];
        for (var i = 0; i < names.length; i++) {
            var v = this._glideVal(el[names[i]]);
            if (v)
                return v;
        }
        for (var key in el) {
            if (!el.hasOwnProperty(key))
                continue;
            if (String(key).toLowerCase().indexOf("release") === -1)
                continue;
            v = this._glideVal(el[key]);
            if (v)
                return v;
        }
        return null;
    },

    _glideVal: function(element) {
        if (element == null || element === undefined)
            return "";
        if (typeof element.getValue === "function")
            return String(element.getValue() || "");
        if (typeof element.getDisplayValue === "function")
            return String(element.getDisplayValue() || "");
        return String(element);
    },

    _getChange: function(parent) {
        var byId = new GlideRecord("change_request");
        if (byId.get(parent))
            return byId;
        var byNumber = new GlideRecord("change_request");
        if (byNumber.get("number", parent))
            return byNumber;
        return null;
    },

    type: "ReleaseChangeState"
};
