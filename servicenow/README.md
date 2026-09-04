# Release state from Change state

The Release is set from the Change's current state (and approval). If the Change moves backwards, the Release is moved to match.

Format used by the Node mapper: [`data/release-change-state-map.json`](../data/release-change-state-map.json).

## Mapping

| Change state | Approval | Release state |
| --- | --- | --- |
| New | (any) | Draft |
| Assess | (any) | Draft |
| Authorize or Approval | requested, not requested, rejected, or blank | Awaiting Approval |
| Authorize or Approval | approved | Approved |
| Scheduled | (any) | Scheduled |
| Implement | (any) | Implementation |
| Review | (any) | Review |
| Closed | (any) | Closed Complete |
| Canceled | (any) | Cancelled |

## Cases this covers

- New → Draft
- Assess → Draft
- Authorize, approval still open → Awaiting Approval
- Approval state, still waiting → Awaiting Approval
- Authorize (or Approval) after approved → Approved
- Scheduled / Implement / Review / Closed / Canceled
- Numeric ServiceNow values (`-5`, `-3`, …) as well as labels
- Forward walk through the Change lifecycle
- Backward walk (Scheduled → Authorize pending → Awaiting Approval; Authorize → Assess → Draft)
- Canceled mid-flow → Cancelled
- Unknown Change state: leave the Release alone
- Already on the right Release state: skip the update

## Deploy

1. System Definition → Business Rules, new rule on Change Request.
2. After insert and after update, when State or Approval changes.
3. Paste from `syncLinkedReleases();` in `sync_release_state_from_change.js`.
4. Set the `RELEASE` values to your `rm_release.state` choices.

Linked Releases are found on `rm_release.change_request`, Change `parent`, or a Record Producer variable named `change_request`.
