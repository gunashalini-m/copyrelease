/**
 * Script Include
 *   Name: ReleaseChangeState
 *   Client callable: false
 *
 * Decision Table: Release to Change state mapping
 * e914679bc34b4350dfef35a60501311b
 */
var ReleaseChangeState = Class.create();
ReleaseChangeState.prototype = {
    initialize: function() {
        this.DECISION_TABLE = "e914679bc34b4350dfef35a60501311b";
        this.RELEASE_DRAFT = "draft";
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
            if (String(rel.getValue("state") || "") === String(target))
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
            releaseGr.setValue("state", this.RELEASE_DRAFT);
            return;
        }

        var chg = this._getChange(parent);
        if (!chg) {
            releaseGr.setValue("state", this.RELEASE_DRAFT);
            return;
        }

        var target = this.stateForChange(chg);
        if (target)
            releaseGr.setValue("state", target);
    },

    stateForChange: function(changeGr) {
        var stateValue = String(changeGr.getValue("state") || "");
        var stateLabel = String(changeGr.getDisplayValue("state") || "");
        var dt = new sn_dt.DecisionTableAPI();
        var tries = [
            { u_change_state: stateValue },
            { change_state: stateValue },
            { u_change_state: stateLabel },
            { change_state: stateLabel }
        ];

        for (var i = 0; i < tries.length; i++) {
            var value = this._readReleaseState(dt.getDecision(this.DECISION_TABLE, tries[i]));
            if (value)
                return value;
        }
        return null;
    },

    _readReleaseState: function(response) {
        if (!response || !response.result_elements)
            return null;
        var el = response.result_elements;
        var names = ["u_release_state", "release_state"];
        for (var i = 0; i < names.length; i++) {
            var v = this._glideVal(el[names[i]]);
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
