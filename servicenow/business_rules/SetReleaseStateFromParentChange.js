/**
 * Business Rule: Set Release state from parent Change
 *
 * Table: Release  (confirm table name: rm_release, sn_dpr_release, or custom)
 * When: before
 * Insert: true
 * Update: true
 * Filter conditions: leave empty (script decides)
 * Advanced: true
 * Order: 1000  (do not steal work from existing before-BRs)
 *
 * Applies only when:
 *  - insert, or
 *  - the parent Change field changes
 *
 * Does not run during Change-driven sync (ChangeReleaseStateSync.RUNNING).
 * Does not abort, does not touch any field except state, and no-ops when
 * the parent field is missing so a wrong table/property cannot break updates.
 */
(function executeRule(current, previous /*null when async*/) {
    try {
        if (typeof current === 'undefined' || !current) {
            return;
        }
        if (ChangeReleaseStateSync.isRunning()) {
            return;
        }

        var parentField = gs.getProperty('change.release.sync.parent_field', 'parent');
        if (!current.isValidField(parentField) || !current.isValidField('state')) {
            return;
        }

        var parentChanged = current.isNewRecord() ? true : current[parentField].changes();
        if (!current.isNewRecord() && !parentChanged) {
            return;
        }

        new ChangeReleaseStateSync().applyToReleaseRecord(current);
    } catch (e) {
        gs.error('Set Release state from parent Change: ' + e);
    }
})(current, previous);
