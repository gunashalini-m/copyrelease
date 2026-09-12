# Release state from Change state

Paste [`sync_release_state_from_change.js`](sync_release_state_from_change.js) into an **after** Business Rule on Change Request when **State** changes.

It uses Decision Table **Release to Change state mapping** (`e914679bc34b4350dfef35a60501311b`).

That table has one input and one result:

| Column | Type | API name to try |
| --- | --- | --- |
| Change State | Choice on `change_request.state` | `u_change_state` then `change_state` |
| Release State | Choice on `rm_release.state` | `u_release_state` then `release_state` |

Do not pass Approval. This table does not have that input; extra keys make `getDecision` return nothing.

The script sends the state **value** first, then the **label**, and reads the answer with `.getValue()` (not `JSON.stringify`).

## Rows on this table

| Change State | Release State |
| --- | --- |
| Authorize | Awaiting Approval |
| Authorize Approval | Awaiting Approval |
| Implemented - Full - Pending Requestor | Deploy/Launch |
| Implemented - Partial - Pending Requestor | Deploy/Launch |
| Closed | Closed Complete |
| Closed - Backed Out | Closed |
| Closed - Failed per Requestor Update - Full | Closed |

Default result is empty: any other Change state leaves the Release alone.

Releases are updated only when `parent` is this Change (sys_id or number). Empty parent is not selected.

## Deploy

1. After BR on Change Request, State changes. Paste [`sync_release_state_from_change.js`](sync_release_state_from_change.js).
2. Optional: Script Include [`script_include_ReleaseChangeState.js`](script_include_ReleaseChangeState.js) and before BR on Release when Parent changes ([`br_release_from_parent.js`](br_release_from_parent.js)) so empty parent stays Draft.
