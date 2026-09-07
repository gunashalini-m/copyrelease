/**
 * ChangeReleaseStateSync
 *
 * Global Script Include (Client callable: false)
 * Name: ChangeReleaseStateSync
 * API Name: ChangeReleaseStateSync
 *
 * Maps Change Request state → Release state using Decision Table
 * "Release to Change state mapping".
 *
 * Safe for client, server, and client+server UI Actions:
 *  - Never updates or aborts the Change record
 *  - Never throws (UI Action current.update() / gsftSubmit must still succeed)
 *  - Never setWorkflow(false) / never bypasses state models or existing BRs
 *  - Recursion guard so our own BRs cannot re-enter
 *
 * System properties (optional overrides):
 *   change.release.sync.release_table   default: rm_release
 *   change.release.sync.parent_field    default: parent
 *   change.release.sync.draft_state     default: draft
 *   change.release.sync.decision_table  default: e914679bc34b4350dfef35a60501311b
 */
var ChangeReleaseStateSync = Class.create();

ChangeReleaseStateSync.RUNNING = false;

ChangeReleaseStateSync.isRunning = function() {
    return ChangeReleaseStateSync.RUNNING === true;
};

ChangeReleaseStateSync.prototype = {
    initialize: function() {
        this.releaseTable = gs.getProperty('change.release.sync.release_table', 'rm_release');
        this.parentField = gs.getProperty('change.release.sync.parent_field', 'parent');
        this.draftState = gs.getProperty('change.release.sync.draft_state', 'draft');
        this.decisionTableId = gs.getProperty(
            'change.release.sync.decision_table',
            'e914679bc34b4350dfef35a60501311b'
        );
    },

    /**
     * Apply Draft vs mapped state onto a Release GlideRecord in memory (no update()).
     * Used by the before BR on Release. No-ops while a Change-driven sync is running.
     * @param {GlideRecord} releaseGr
     * @returns {Boolean} true if state was changed on the in-memory record
     */
    applyToReleaseRecord: function(releaseGr) {
        try {
            if (ChangeReleaseStateSync.isRunning()) {
                return false;
            }
            if (!releaseGr || !releaseGr.isValidField('state')) {
                return false;
            }
            if (!releaseGr.isValidField(this.parentField)) {
                return false;
            }

            var parentId = String(releaseGr.getValue(this.parentField) || '');
            if (!parentId) {
                return this._setStateIfDifferent(releaseGr, this.draftState);
            }

            var changeGr = this._getChange(parentId);
            if (!changeGr) {
                gs.warn('ChangeReleaseStateSync: parent Change ' + parentId + ' not found; leaving Release state unchanged');
                return false;
            }

            var mapped = this.getReleaseStateFromChangeState(changeGr.getValue('state'));
            if (this._isBlank(mapped)) {
                gs.warn(
                    'ChangeReleaseStateSync: no Decision Table result for Change state ' +
                        changeGr.getValue('state') +
                        ' on ' +
                        changeGr.getDisplayValue()
                );
                return false;
            }

            return this._setStateIfDifferent(releaseGr, mapped);
        } catch (e) {
            gs.error('ChangeReleaseStateSync.applyToReleaseRecord: ' + e);
            return false;
        }
    },

    /**
     * Push the current Change state onto every child Release.
     * Call from an after insert/update BR on change_request when state changes.
     * Does not modify the Change GlideRecord passed in.
     * @param {GlideRecord} changeGr
     * @returns {Number} count of Releases updated
     */
    syncReleasesFromChange: function(changeGr) {
        if (ChangeReleaseStateSync.isRunning()) {
            return 0;
        }

        ChangeReleaseStateSync.RUNNING = true;
        try {
            if (!changeGr || !changeGr.getUniqueValue()) {
                return 0;
            }

            var mapped = this.getReleaseStateFromChangeState(changeGr.getValue('state'));
            if (this._isBlank(mapped)) {
                gs.warn(
                    'ChangeReleaseStateSync: no Decision Table result for Change ' +
                        changeGr.getDisplayValue() +
                        ' state=' +
                        changeGr.getValue('state')
                );
                return 0;
            }

            var releaseGr = new GlideRecord(this.releaseTable);
            if (!releaseGr.isValid() || !releaseGr.isValidField(this.parentField) || !releaseGr.isValidField('state')) {
                gs.error('ChangeReleaseStateSync: Release table/fields invalid: ' + this.releaseTable);
                return 0;
            }

            releaseGr.addQuery(this.parentField, changeGr.getUniqueValue());
            releaseGr.query();

            var updated = 0;
            while (releaseGr.next()) {
                if (String(releaseGr.getValue('state')) === String(mapped)) {
                    continue;
                }

                try {
                    // Keep workflow engines on so existing Release BRs, notifications,
                    // and state models still run. RUNNING skips only *this* Script Include.
                    releaseGr.setValue('state', mapped);
                    if (releaseGr.update()) {
                        updated += 1;
                    }
                } catch (recordErr) {
                    gs.error(
                        'ChangeReleaseStateSync: skipped Release ' +
                            releaseGr.getUniqueValue() +
                            ': ' +
                            recordErr
                    );
                }
            }

            return updated;
        } catch (e) {
            gs.error('ChangeReleaseStateSync.syncReleasesFromChange: ' + e);
            return 0;
        } finally {
            ChangeReleaseStateSync.RUNNING = false;
        }
    },

    /**
     * Look up Release State choice value from Change State choice value.
     * Pass getValue('state'), never the display label.
     * @param {String} changeStateValue
     * @returns {String|null}
     */
    getReleaseStateFromChangeState: function(changeStateValue) {
        if (this._isBlank(changeStateValue)) {
            return null;
        }

        try {
            var inputs = {};
            inputs.u_change_state = changeStateValue;

            var dt = new sn_dt.DecisionTableAPI();
            var response = dt.getDecision(this.decisionTableId, inputs);
            if (!response || !response.result_elements) {
                return null;
            }

            var result = response.result_elements.u_release_state;
            if (!result) {
                return null;
            }

            if (typeof result.getValue === 'function') {
                return result.getValue();
            }

            return String(result);
        } catch (e) {
            gs.error('ChangeReleaseStateSync: Decision Table failed: ' + e);
            return null;
        }
    },

    _getChange: function(sysId) {
        var changeGr = new GlideRecord('change_request');
        if (changeGr.get(sysId)) {
            return changeGr;
        }
        return null;
    },

    _setStateIfDifferent: function(releaseGr, newState) {
        if (this._isBlank(newState)) {
            return false;
        }
        if (String(releaseGr.getValue('state')) === String(newState)) {
            return false;
        }
        releaseGr.setValue('state', newState);
        return true;
    },

    _isBlank: function(value) {
        return value === null || value === undefined || value === '';
    },

    type: 'ChangeReleaseStateSync'
};
