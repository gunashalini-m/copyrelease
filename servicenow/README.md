# Copy Release (ServiceNow UI Action)

Server-side UI Action for `rm_release`. Paste from `copyReleaseRecord();` downward into the Script field. Do **not** wrap it in an extra `(function() { ... })();` — that pattern can fail in ServiceNow's Rhino engine before `insert()` runs, so no record is created.

If variable copy hits an error, the new Release is still kept and an error message is shown.

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

## Clear values on copy (variables stay on the form)

Listed variables are still created on the copy. Only the **value** is left blank — they are not removed from the Variable Editor or MRVS grid.

At the top of `copy_release_ui_action.js`, fill in internal names (not labels):

| List | What it does |
| --- | --- |
| `CLEAR_VARIABLES` | Copy the variable, leave its value blank |
| `CLEAR_VARIABLE_SETS` | Copy every variable in the set (including MRVS rows/columns), leave those values blank |
| `CLEAR_SET_COLUMNS` | Copy those columns as blank; other columns still get source values |

Find names in **Service Catalog → Variables** (`item_option_new.name`) and **Variable Sets** (`item_option_new_set.internal_name`).

Example: `change_request` stays on the form with no value; Implementation Plan rows copy except `planned_start_time` and `planned_end_time`, which stay blank:

```javascript
var CLEAR_VARIABLES = [
    "change_request"
];

var CLEAR_VARIABLE_SETS = [
];

var CLEAR_SET_COLUMNS = {
    "u_agile_implementation_plan": ["planned_start_time", "planned_end_time"]
};
```

## After deploy

Confirm the UI Action has **Client** unchecked. Replace the Script field with `servicenow/copy_release_ui_action.js` (from `copyReleaseRecord();` down). Click **Copy Release** on a populated record. You should land on `Copy of - …`. If variable copy fails, the new Release still exists and a red error names the exception.

Open a Release that has populated MRVS grids (Agile Implementation Plan, Production Validation Plan, Backout Plan, Contact, and so on). Click **Copy Release**. The new record (`Copy of - …`) should show the same variables and grid columns. Listed fields are empty; everything else is copied.
