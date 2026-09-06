# Release state from Change state

Paste [`sync_release_state_from_change.js`](sync_release_state_from_change.js) into one **after** Business Rule on Change Request (State or Approval changes).

The Decision Table is the mapping. The script reads it the way `sn_dt.DecisionTableAPI` actually works: `u_` column names and `.getValue()` on the answer. `JSON.stringify` looks empty even when a row matched — that is not a failed call.

If the table has no matching row, the script uses the built-in map so the Release still moves.

## Decision Table

| Column | Technical name |
| --- | --- |
| Change State | `u_change_state` (choice **value**, e.g. `-3`) |
| Change Approval | `u_change_approval` (`requested`, `approved`, …) |
| Release State | `u_release_state` |

Name the table **Change to Release State**, or set `DECISION_TABLE_SYS_ID` at the top of the script. Washington DC+: table → **Code snippet** for the exact `u_` names.

| u_change_state | u_change_approval | u_release_state |
| --- | --- | --- |
| `-5` New | (any) | draft |
| `-4` Assess | (any) | draft |
| `-3` Authorize | not `approved` | awaiting_approval |
| `-3` Authorize | `approved` | approved |
| `-2` Scheduled | (any) | scheduled |
| `-1` Implement | (any) | implementation |
| `0` Review | (any) | review |
| `3` Closed | (any) | closed |
| `4` Canceled | (any) | cancelled |

Releases are found only by `parent` = this Change (sys_id or number). Empty parent is not in that query (stays Draft). Optional Release before-rule: [`br_release_from_parent.js`](br_release_from_parent.js) + Script Include [`script_include_ReleaseChangeState.js`](script_include_ReleaseChangeState.js).

## Deploy

1. Create the Decision Table with the columns above.
2. After BR on Change Request when State or Approval changes. Paste the Change script.
3. Optional: before BR on Release when Parent changes, empty parent → Draft.
