/**
 * Business Rule: Release state from parent Change
 * Table: Release [rm_release]
 * When: before insert / before update
 * Filter: Parent changes (also run on insert)
 *
 * Empty parent → Draft. Otherwise map from that Change only.
 * Before-rule so state is set on the same save, no second update().
 *
 * Paste the one line below into the Script field.
 * Mapping is in Script Include ReleaseChangeState.
 */
new ReleaseChangeState().applyFromParent(current);
