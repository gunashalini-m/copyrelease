/**
 * Script Include
 *   Name: ReleaseChangeState
 *   Client callable: false
 *
 * Mapping is the Decision Table. Both Business Rules call this class.
 *
 * Decision Table (Workflow Studio → Decision tables):
 *   Input:  Change State     → column name u_change_state
 *   Input:  Change Approval  → column name u_change_approval  (optional but needed
 *                              to split Authorize pending vs approved)
 *   Result: Release State    → column name u_release_state
 *
 * getDecision() returns a GlideRecord-like answer. JSON.stringify looks empty.
 * Read the result with .getValue() / .getDisplayValue(), not stringify.
 */
var ReleaseChangeState = Class.create();
ReleaseChangeState.prototype = {
    initialize: function() {
        // sys_id from the Decision Table URL:
        // /now/decisiondesigner/decisiontable/<sys_id>
        this.DECISION_TABLE = "YOUR_DECISION_TABLE_SYS_ID";

        this.RELEASE = {
            draft: "draft"
        };
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
        return this.stateFromDecision(
            String(changeGr.getValue("state") || ""),
            String(changeGr.getValue("approval") || "")
        );
    },

    stateFromDecision: function(changeState, changeApproval) {
        if (!this.DECISION_TABLE || this.DECISION_TABLE.indexOf("YOUR_") === 0) {
            gs.error("ReleaseChangeState: set DECISION_TABLE to the Decision Table sys_id");
            return null;
        }

        var dt = new sn_dt.DecisionTableAPI();
        var inputs = {};
        // Names must match sys_decision_input.column_name (u_ + lowercase + underscores).
        inputs.u_change_state = changeState;
        inputs.u_change_approval = changeApproval;

        var response = dt.getDecision(this.DECISION_TABLE, inputs);
        if (!response || !response.result_elements) {
            gs.info("ReleaseChangeState: no decision for state=" + changeState +
                " approval=" + changeApproval);
            return null;
        }

        return this._answerValue(response.result_elements.u_release_state);
    },

    _answerValue: function(element) {
        if (element == null)
            return null;
        if (typeof element.getValue === "function") {
            var v = String(element.getValue() || "");
            return v || null;
        }
        var s = String(element);
        return s || null;
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
