# Change → Release state sync

When a Change Request state changes (almost always from a UI Action), every child Release should take the mapped Release State from Decision Table **Release to Change state mapping**. A Release with no parent Change stays in **Draft**. Linking a Change on update maps immediately.

## Why Business Rules, not UI Actions

Change State is updated by **client**, **server**, or **client + server** UI Actions. Putting mapping code in those actions means every button must be touched and any missed action (or a future action) silently skips sync.

Every one of those UI Actions still writes `change_request.state` on the server. An **after** Business Rule on that field therefore covers:

- Client UI Action → `g_form.setValue('state')` + save
- Server UI Action → `current.state = …; current.update()`
- Mixed UI Action → client GlideAjax / `gsftSubmit` plus a server script
- Any other server update of State (API, Flow, another BR)

Do **not** paste the Decision Table snippet into each UI Action.

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
Release insert/update
  ├─ parent Change empty  → Release.state = Draft
  └─ parent Change set    → Release.state = Decision Table(Change.state)

Change Request insert/update where state changes
  └─ each Release where parent = this Change
        → Release.state = Decision Table(Change.state)
```

Child updates use `setWorkflow(false)` so the Release BR does not run again in the same transaction.

## Install on the instance

1. Confirm the Release table name and the field that references Change (`parent` is assumed). Set the [system properties](sys_properties.md) if they differ.
2. Set `change.release.sync.draft_state` to the **stored choice value** for Draft (not the label).
3. Create Script Include **ChangeReleaseStateSync** from [`script_includes/ChangeReleaseStateSync.js`](script_includes/ChangeReleaseStateSync.js). Application: Global. Client callable: false.
4. Create Business Rule **Sync child Releases on Change state** from [`business_rules/SyncChildReleasesOnChangeState.js`](business_rules/SyncChildReleasesOnChangeState.js) on `change_request`.
5. Create Business Rule **Set Release state from parent Change** from [`business_rules/SetReleaseStateFromParentChange.js`](business_rules/SetReleaseStateFromParentChange.js) on the Release table.
6. If Release uses a **state model** that blocks the mapped transition, either allow those transitions in the model or keep `setWorkflow(false)` on the Change-driven path (already in the Script Include). Test Closed / Closed Complete paths especially.

## What not to do

- Do not call `getDecision` from client scripts. Decision Table API is server-side.
- Do not use `gs.log` in production (the Workflow Studio snippet does). The Script Include uses `gs.error` / `gs.warn`.
- Do not pass display values into `u_change_state`.
- Do not `setWorkflow(false)` on the Change BR itself; only on the child Release `update()`.

## Smoke test

1. Create a Release with **no** parent → State is **Draft**.
2. Set parent to a Change in **Authorize** → Release becomes **Awaiting Approval**.
3. On the Change, click the UI Action that moves State to **Implemented - Full - Pending Requestor** → related Release becomes **Deploy/Launch**.
4. Repeat with a **client-only** and a **server** UI Action if you have both.
5. Clear the Release parent → State returns to **Draft**.
6. Click a Change UI Action for a state **not** in the table → Release state stays put; check System Log for the warning.
