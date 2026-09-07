/**
 * Business Rule: Sync child Releases on Change state
 *
 * Table: Change Request [change_request]
 * When: after
 * Insert: true
 * Update: true
 * Filter conditions: State changes
 * Advanced: true
 *
 * Why this BR (not each UI Action):
 * Change State is updated by client UI Actions, server UI Actions, or both.
 * All of those paths end in a server update of change_request.state.
 * One after-BR catches every path without duplicating Decision Table calls.
 */
(function executeRule(current, previous /*null when async*/) {
    new ChangeReleaseStateSync().syncReleasesFromChange(current);
})(current, previous);
