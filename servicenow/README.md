# Release state from Change state

Two tables, two thin Business Rules, **one Script Include**. That is the cheap way to cover both events without running the mapping twice.

| Event | Table | When | Call |
| --- | --- | --- | --- |
| Change state or approval changes (including backwards) | Change Request | **after**, State or Approval changes | `syncFromChange(current)` |
| Parent set, cleared, or Release inserted | Release | **before**, Parent changes / insert | `applyFromParent(current)` |

The after-rule on Change finds Releases with `parent` = this Change, writes state, then `setWorkflow(false)` so the Release rule does not fire again on that update. The before-rule on Release sets `current.state` on the same save — empty parent → Draft, no extra `update()`.

Do not put this on `task`. Both records extend task, and that rule would run on every incident, problem, and catalog item.

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

Only `rm_release.parent` is used.

## Cases this covers

- No parent → Draft (Release before-rule)
- Parent cleared → Draft
- Parent set to a Change that cannot be found → Draft
- Change state/approval changes → only Releases parented to that Change
- New / Assess → Draft
- Authorize or Approval, still waiting → Awaiting Approval
- Authorize or Approval, approved → Approved
- Scheduled / Implement / Review / Closed / Canceled
- Numeric ServiceNow values (`-5`, `-3`, …) as well as labels
- Forward and backward walks through Change states
- Canceled mid-flow → Cancelled
- Unknown Change state: leave the Release
- Already on the mapped state: skip the write
- Change-driven update does not re-enter the Release rule (`setWorkflow(false)`)

## Deploy

1. Script Include `ReleaseChangeState` from [`script_include_ReleaseChangeState.js`](script_include_ReleaseChangeState.js). Client callable: false. Set the `RELEASE` choice values to match your instance.
2. Business Rule on **Change Request**, after insert/update, State or Approval changes. Script: [`sync_release_state_from_change.js`](sync_release_state_from_change.js).
3. Business Rule on **Release**, before insert/update, Parent changes (run on insert). Script: [`br_release_from_parent.js`](br_release_from_parent.js).
