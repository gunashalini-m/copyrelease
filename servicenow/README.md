# Copy Release (ServiceNow UI Action)

Server-side UI Action for `rm_release`. Paste `copy_release_ui_action.js` into the Script field.

## UI Action

| Field | Value |
| --- | --- |
| Table | Release `[rm_release]` |
| Client | false |
| Form button | true |

## What was broken

Single-row variables copied, but Multi-Row Variable Set (MRVS) grids on the copy showed **No data to display**.

1. `newQa.value = qaGR.value` assigns a GlideElement. MRVS JSON in `question_answer.value` must be copied with `getValue` / `setValue`.
2. `sc_multi_row_question_answer.parent_id` is often the MRVS `question_answer` sys_id, not the Release sys_id. Querying only `parent_id = current.sys_id` copies no cell rows.
3. Copied cells must point at the **new** `question_answer` rows.
4. `sc_item_produced_record.task` must be the new Release sys_id. Without it, the Variable Editor does not render MRVS as a table.
5. After cell copy, rebuild `question_answer.value` JSON from the new rows so the formatter has data to display.

## After deploy

Open a Release that has populated MRVS grids (Agile Implementation Plan, Production Validation Plan, Backout Plan, Contact, and so on). Click **Copy Release**. The new record (`Copy of - …`) should show the same rows, not empty grids.
