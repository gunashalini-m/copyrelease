# Change → Release state sync

When a Change Request state changes, every child Release takes the mapped Release State from Decision Table **Release to Change state mapping**. A Release with no parent Change is set to **Draft** on insert (and when the parent is cleared). Linking a Change maps immediately.

Existing Change UI Actions are not modified.

## Client, server, and client+server UI Actions

Change State is moved by UI Actions that are **client**, **server**, or **both**. This solution never edits those actions.

| UI Action type | What already happens | What we hook |
| --- | --- | --- |
| Client only | `g_form.setValue('state', …)` then save / submit | After BR on the resulting `change_request` update |
| Server only | `current.state = …; current.update()` | After BR inside that `update()` |
| Client + server | Client `gsftSubmit(null, g_form.getFormElement(), 'action_name')` then the existing server script | After BR on the server `update()` only. The onclick / `gsftSubmit` path is untouched |

Do **not** paste Decision Table code into UI Actions. Do **not** add a client script or GlideAjax. `ChangeReleaseStateSync` is **not** client-callable.

The Change after BR:

- Does not call `current.update()`
- Does not `setAbortAction`
- Does not call `action.setRedirectURL` / `action.setReturnURL`
- Does not change any field on the Change
- Catches all errors so a mapping failure cannot fail the UI Action

Order **1000** so existing after Business Rules on Change still run first.

## Do not disturb existing functionality

- Filter on the Change BR is **State changes**. Assign, add CI, comments, and other UI Actions that do not change State never enter this code.
- Child Release updates keep workflow **on** (no `setWorkflow(false)`), so existing Release Business Rules, notifications, and state models still run. A recursion flag skips only this Script Include.
- If one Release `update()` fails (ACL, state model, mandatory field), that record is logged and skipped. The Change UI Action still succeeds.
- The Release before BR only runs on **insert** or when **parent changes**. Other Release field updates, including existing Release UI Actions, are left alone.
- If the configured Release table or parent field is invalid, the scripts return without writing.

## Decision Table (already built)

| Item | Value |
| --- | --- |
| Name | Release to Change state mapping |
| Sys ID | `e914679bc34b4350dfef35a60501311b` |
| Scope | Global |
| Input | `u_change_state` — Change Request `state` **choice value** |
| Output | `u_release_state` — Release `state` **choice value** |
| API | `sn_dt.DecisionTableAPI().getDecision()` — first matching row |

Pass `change.getValue('state')`. Do not pass display labels such as `Authorize`.

Visible mappings (ranks 1–4 may exist above the screenshot):

| Change State | Release State |
| --- | --- |
| Authorize | Awaiting Approval |
| Implemented - Full - Pending Requestor | Deploy/Launch |
| Implemented - Partial - Pending Requestor | Deploy/Launch |
| Authorize Approval | Awaiting Approval |
| Closed | Closed Complete |
| Closed - Backed Out | Closed |
| Closed - Failed per Requestor Update - Full | Closed |

If a Change state has **no row and no default result**, child Releases are left unchanged and a warning is logged. Add the missing row in Workflow Studio rather than hard-coding a fallback.

## Behaviour

```
Release insert
  ├─ parent Change empty  → Release.state = Draft
  └─ parent Change set    → Release.state = Decision Table(Change.state)

Release update where parent field changes
  ├─ parent cleared       → Release.state = Draft
  └─ parent set/swapped   → Release.state = Decision Table(Change.state)

Change Request insert/update where State changes
  (after existing Change BRs, after UI Action server script has written current)
  └─ each Release where parent = this Change
        → Release.state = Decision Table(Change.state)
```

## Install on the instance

1. Confirm the Release table name and the field that references Change (`parent` is assumed). Set the [system properties](sys_properties.md) if they differ.
2. Set `change.release.sync.draft_state` to the **stored choice value** for Draft (not the label).
3. Create Script Include **ChangeReleaseStateSync** from [`script_includes/ChangeReleaseStateSync.js`](script_includes/ChangeReleaseStateSync.js). Application: Global. **Client callable: false**.
4. Create Business Rule **Sync child Releases on Change state** from [`business_rules/SyncChildReleasesOnChangeState.js`](business_rules/SyncChildReleasesOnChangeState.js) on `change_request` (after, State changes, order 1000).
5. Create Business Rule **Set Release state from parent Change** from [`business_rules/SetReleaseStateFromParentChange.js`](business_rules/SetReleaseStateFromParentChange.js) on the Release table (before, insert+update, order 1000).
6. If a Release **state model** blocks a mapped transition, allow that transition in the model. Do not bypass it in script.

## What not to do

- Do not edit existing UI Action client or server scripts.
- Do not call `getDecision` from client scripts.
- Do not use `gs.log` (the Workflow Studio snippet does). The Script Include uses `gs.error` / `gs.warn`.
- Do not pass display values into `u_change_state`.
- Do not `setWorkflow(false)` on Change or Release.

## Smoke test

1. Create a Release with **no** parent → State is **Draft**.
2. Set parent to a Change in **Authorize** → Release becomes **Awaiting Approval**.
3. Click a **client+server** Change UI Action that moves State to **Implemented - Full - Pending Requestor** → UI Action still redirects as before; related Release becomes **Deploy/Launch**.
4. Repeat with a client-only and a server-only UI Action if you have them. Confirm those buttons still complete (redirect, work notes, attachments, etc.).
5. Run a Change UI Action that does **not** change State → Release unchanged.
6. Clear the Release parent → State returns to **Draft**.
7. Unmapped Change state → Release unchanged; Change UI Action still succeeds.
