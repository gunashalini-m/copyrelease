# Release state from Change state

This is **one Business Rule** on Change Request. Change state and approval live on that table, so that is the table the rule has to run on. The script then writes the matching state onto Releases whose **parent** is this Change (number or sys_id).

A Release with no parent is never in that query, so this rule does not touch it. Leave `rm_release.state` defaulting to Draft and those records stay Draft.

Format: [`data/release-change-state-map.json`](../data/release-change-state-map.json).

## Mapping

| Release parent | Change state | Approval | Release state |
| --- | --- | --- | --- |
| empty | — | — | **Draft** (rule does not run) |
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

- No parent on the Release → not selected, stays Draft
- Only Releases whose parent is this Change are updated
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

1. System Definition → Business Rules, one new rule on **Change Request**.
2. After insert and after update, when State or Approval changes.
3. Paste from `syncReleasesForThisChange();` in `sync_release_state_from_change.js`.
4. Set the `RELEASE` values to your `rm_release.state` choices.
