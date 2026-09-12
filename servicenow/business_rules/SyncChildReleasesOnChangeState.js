/**
 * Business Rule: Sync child Releases on Change state
 *
 * Table: Change Request [change_request]
 * When: after
 * Insert: true
 * Update: true
 * Filter conditions: State [changes]
 * Advanced: true
 * Order: 1000  (run after existing after-BRs on Change)
 * Abort action: not used
 * Client callable / UI Action changes: none
 *
 * Client + server UI Actions:
 *  - Client half (onclick / gsftSubmit) is never invoked from here
 *  - Server half (current.state = …; current.update()) triggers this BR
 *    after the Change row is written
 *  - This script must not call current.update(), setAbortAction, or
 *    action.setRedirectURL — those stay with the existing UI Action
 *
 * Wrap in try/catch so a Decision Table / child-update failure cannot
 * fail the UI Action's current.update().
 */
(function executeRule(current, previous /*null when async*/) {
    try {
        if (typeof current === 'undefined' || !current) {
            return;
        }
        if (current.isActionAborted && current.isActionAborted()) {
            return;
        }
        if (ChangeReleaseStateSync.isRunning()) {
            return;
        }
        new ChangeReleaseStateSync().syncReleasesFromChange(current);
    } catch (e) {
        gs.error('Sync child Releases on Change state: ' + e);
    }
})(current, previous);
