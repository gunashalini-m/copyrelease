/**
 * Business Rule: Set Release state from parent Change
 *
 * Table: Release  (confirm table name: rm_release, sn_dpr_release, or custom)
 * When: before
 * Insert: true
 * Update: true
 * Filter conditions: leave empty (logic is in the script).
 * Advanced: true
 *
 * Rules:
 *  - No parent Change  → Draft
 *  - Parent Change set/changed → Decision Table maps Change.state → Release.state
 *
 * Other Release field updates do not overwrite State unless parent changed.
 */
(function executeRule(current, previous /*null when async*/) {
    var parentField = gs.getProperty('change.release.sync.parent_field', 'parent');
    var parentChanged = current[parentField].changes();
    var hasParent = !current[parentField].nil();

    // Inserts always apply. Updates apply when parent is added, removed, or swapped,
    // or when the record still has no parent (keep Draft).
    if (!current.isNewRecord() && !parentChanged && hasParent) {
        return;
    }

    new ChangeReleaseStateSync().applyToReleaseRecord(current);
})(current, previous);
