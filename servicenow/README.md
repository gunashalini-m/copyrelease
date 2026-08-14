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

## Omit variables on copy

At the top of `copy_release_ui_action.js`, fill in internal names (not labels):

| List | What it skips |
| --- | --- |
| `OMIT_VARIABLES` | Individual variables (and MRVS columns with the same internal name) |
| `OMIT_VARIABLE_SETS` | Every variable in that set, including a whole MRVS grid |
| `OMIT_SET_COLUMNS` | Only the listed columns; the rest of the set still copies |

Find names in **Service Catalog → Variables** (`item_option_new.name`) and **Variable Sets** (`item_option_new_set.internal_name`).

Example: copy Implementation Plan rows but not planned start/end, skip Contact entirely, and leave `release_manager` blank:

```javascript
var OMIT_VARIABLES = [
    "release_manager"
];

var OMIT_VARIABLE_SETS = [
    "agile_contact"
];

var OMIT_SET_COLUMNS = {
    "agile_implementation_plan": ["planned_start_time", "planned_end_time"]
};
```

Omitted variables still appear on the copied form (the record producer is linked) but have no copied value. Everything else is copied.

## After deploy

Open a Release that has populated MRVS grids (Agile Implementation Plan, Production Validation Plan, Backout Plan, Contact, and so on). Click **Copy Release**. The new record (`Copy of - …`) should show the same rows, not empty grids, minus anything listed in the omit arrays.
