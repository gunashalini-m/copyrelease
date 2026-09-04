/**
 * Business Rule: Sync Release state from Change
 * Table: Change Request [change_request]
 * When: after insert / after update
 * Filter: State changes OR Approval changes
 *
 * Paste the one line below into the Script field.
 * Mapping is in Script Include ReleaseChangeState.
 */
new ReleaseChangeState().syncFromChange(current);
