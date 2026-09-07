/**
 * ChangeReleaseStateSync
 *
 * Global Script Include (Client callable: false)
 * Name: ChangeReleaseStateSync
 * API Name: ChangeReleaseStateSync
 *
 * Single place for Change → Release state mapping via Decision Table
 * "Release to Change state mapping".
 *
 * System properties (optional overrides):
 *   change.release.sync.release_table   default: rm_release
 *   change.release.sync.parent_field    default: parent
 *   change.release.sync.draft_state     default: draft
 *   change.release.sync.decision_table  default: e914679bc34b4350dfef35a60501311b
 */
var ChangeReleaseStateSync = Class.create();
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
     * Apply Draft vs mapped state onto a Release GlideRecord (does not update).
     * Call from a before insert/update Business Rule on the Release table.
     * @param {GlideRecord} releaseGr
     * @returns {Boolean} true if state was changed on the in-memory record
     */
    applyToReleaseRecord: function(releaseGr) {
        if (!releaseGr) {
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
        if (mapped === null || mapped === undefined || mapped === '') {
            gs.warn(
                'ChangeReleaseStateSync: no Decision Table result for Change state ' +
                    changeGr.getValue('state') +
                    ' on ' +
                    changeGr.getDisplayValue()
            );
            return false;
        }

        return this._setStateIfDifferent(releaseGr, mapped);
    },

    /**
     * Push the current Change state onto every child Release.
     * Call from an after insert/update Business Rule on change_request
     * when state changes (covers client, server, and mixed UI Actions).
     * @param {GlideRecord} changeGr
     * @returns {Number} count of Releases updated
     */
    syncReleasesFromChange: function(changeGr) {
        if (!changeGr || !changeGr.isValidRecord()) {
            return 0;
        }

        var mapped = this.getReleaseStateFromChangeState(changeGr.getValue('state'));
        if (mapped === null || mapped === undefined || mapped === '') {
            gs.warn(
                'ChangeReleaseStateSync: no Decision Table result for Change ' +
                    changeGr.getDisplayValue() +
                    ' state=' +
                    changeGr.getValue('state')
            );
            return 0;
        }

        var releaseGr = new GlideRecord(this.releaseTable);
        if (!releaseGr.isValid()) {
            gs.error('ChangeReleaseStateSync: Release table is invalid: ' + this.releaseTable);
            return 0;
        }

        releaseGr.addQuery(this.parentField, changeGr.getUniqueValue());
        releaseGr.query();

        var updated = 0;
        while (releaseGr.next()) {
            if (String(releaseGr.getValue('state')) === String(mapped)) {
                continue;
            }

            // Avoid re-entry into Release Business Rules / state models in this same sync.
            releaseGr.setWorkflow(false);
            releaseGr.autoSysFields(true);
            releaseGr.setValue('state', mapped);
            if (releaseGr.update()) {
                updated += 1;
            }
        }

        return updated;
    },

    /**
     * Look up Release State choice value from Change State choice value.
     * Pass getValue('state'), never the display label.
     * @param {String} changeStateValue
     * @returns {String|null}
     */
    getReleaseStateFromChangeState: function(changeStateValue) {
        if (changeStateValue === null || changeStateValue === undefined || changeStateValue === '') {
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
        if (String(releaseGr.getValue('state')) === String(newState)) {
            return false;
        }
        releaseGr.setValue('state', newState);
        return true;
    },

    type: 'ChangeReleaseStateSync'
};
