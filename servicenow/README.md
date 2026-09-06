# Release state from Change state

Two thin Business Rules call Script Include `ReleaseChangeState`. The mapping itself is a **Decision Table**. That is what `sn_dt.DecisionTableAPI` is for.

## Why the Decision API looked like it failed

`getDecision()` often **did** return a row. The script never read it.

1. **Input / result names need `u_`.** Decision Builder stores `Change State` as `u_change_state` and `Release State` as `u_release_state`. Keys like `change_state` and `release_state` do not match, so you get null / no `result_elements`.
2. **`JSON.stringify(result)` is empty on purpose.** Answers are GlideElements. Use `result.result_elements.u_release_state.getValue()`.
3. **Placeholder sys_id.** `YOUR_DECISION_TABLE_SYS_ID` is not a table. Copy the sys_id from the Decision Table URL (`/now/decisiondesigner/decisiontable/<sys_id>`).
4. **No matching row and no default.** `getDecision` returns null. Add a default row, or also pass **Change Approval** so Authorize pending vs approved can be two rows.
5. **Parent query.** Look up Releases by parent = Change sys_id **or** number.

Washington DC+ : open the Decision Table → **Code snippet**. That paste already has the correct `u_` names.

## Decision Table

| Column | Type | Technical name |
| --- | --- | --- |
| Change State | Choice / String (Change `state` value, e.g. `-3`) | `u_change_state` |
| Change Approval | Choice / String (`requested`, `approved`, …) | `u_change_approval` |
| Release State | Choice on `rm_release.state` | `u_release_state` |

Example rows:

| u_change_state | u_change_approval | u_release_state |
| --- | --- | --- |
| `-5` or New | (any) | draft |
| `-4` Assess | (any) | draft |
| `-3` Authorize | not `approved` | awaiting_approval |
| `-3` Authorize | `approved` | approved |
| `-2` Scheduled | (any) | scheduled |
| … | … | … |

Empty parent is still handled by the Release before-rule (Draft). Do not expect the Decision Table to see those records.

## Rules

| Event | Table | When | Call |
| --- | --- | --- | --- |
| Change state or approval changes | Change Request | after | `syncFromChange(current)` |
| Parent set, cleared, or insert | Release | before | `applyFromParent(current)` |

Change-driven `update()` uses `setWorkflow(false)` so the Release rule does not run again.

## Deploy

1. Create the Decision Table. Copy its sys_id into `DECISION_TABLE` in [`script_include_ReleaseChangeState.js`](script_include_ReleaseChangeState.js).
2. Script Include `ReleaseChangeState`, client callable false.
3. After BR on Change Request: State or Approval changes. [`sync_release_state_from_change.js`](sync_release_state_from_change.js).
4. Before BR on Release: Parent changes / insert. [`br_release_from_parent.js`](br_release_from_parent.js).
