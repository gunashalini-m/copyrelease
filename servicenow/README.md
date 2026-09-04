# Release state from Change state

The only Change used is the one on **Release.parent** (Change number or sys_id). If parent is empty, the Release is **Draft** and stays there.

When that Change's state or approval changes, including backwards, the Release is moved to match.

Format: [`data/release-change-state-map.json`](../data/release-change-state-map.json).

## Mapping

| Release parent | Change state | Approval | Release state |
| --- | --- | --- | --- |
| empty | — | — | **Draft** |
| Change number | New | (any) | Draft |
| Change number | Assess | (any) | Draft |
| Change number | Authorize or Approval | requested, not requested, rejected, or blank | Awaiting Approval |
| Change number | Authorize or Approval | approved | Approved |
| Change number | Scheduled | (any) | Scheduled |
| Change number | Implement | (any) | Implementation |
| Change number | Review | (any) | Review |
| Change number | Closed | (any) | Closed Complete |
| Change number | Canceled | (any) | Cancelled |

`rm_release.change_request` and Record Producer variables are not used.

## Cases this covers

- No parent on the Release → Draft only
- Parent cleared later → back to Draft
- Parent set to a Change that cannot be found → Draft
- Only Releases whose parent is this Change are updated from the Change BR
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
- Unknown Change state: leave the Release alone (parent still present)
- Already on the right Release state: skip the update

## Deploy

**Rule 1 — Change Request** (`sync_release_state_from_change.js`)

1. System Definition → Business Rules, new rule on Change Request.
2. After insert and after update, when State or Approval changes.
3. Paste from `syncReleasesForThisChange();`.

**Rule 2 — Release** (`apply_release_state_from_parent.js`)

1. New rule on Release `[rm_release]`.
2. Before insert and before update, when Parent changes (run on insert too).
3. Paste from `applyStateFromParentChange();`.

Set the `RELEASE` values to your `rm_release.state` choices.
