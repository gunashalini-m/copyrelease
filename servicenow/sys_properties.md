# System properties

Create these in **sys_properties** (Global). They let you point the Script Include at the real Release table and Draft choice **value** without editing code.

| Name | Type | Default | Purpose |
| --- | --- | --- | --- |
| `change.release.sync.release_table` | string | `rm_release` | Table whose display name is **Release** in the Decision Table result column. Change this if your table is `sn_dpr_release` or a custom `u_*` table. |
| `change.release.sync.parent_field` | string | `parent` | Reference (or Task parent) field on Release that points at the Change. |
| `change.release.sync.draft_state` | string | `draft` | Stored **choice value** for Release State = Draft (not the label). Look this up under System Definition → Choice Lists for table Release, element `state`. |
| `change.release.sync.decision_table` | string | `e914679bc34b4350dfef35a60501311b` | Sys ID of **Release to Change state mapping**. |

Confirm Draft with:

```javascript
var ch = new GlideRecord('sys_choice');
ch.addQuery('name', gs.getProperty('change.release.sync.release_table', 'rm_release'));
ch.addQuery('element', 'state');
ch.addQuery('label', 'Draft');
ch.query();
if (ch.next()) {
    gs.info('Draft value=' + ch.getValue('value'));
}
```
