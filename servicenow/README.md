# ServiceNow: Release ↔ Change state mapping

Releases stay aligned with their linked Change. The mapping is a **projection of the current Change snapshot**, so if the Change moves backward (for example Scheduled → Authorize), the Release moves back as well.

## Mapping

| Change state | Change approval | Release state |
| --- | --- | --- |
| New | any | Draft |
| Assess | any | Draft |
| Authorize **or** Approval | requested, not requested, or rejected | **Awaiting Approval** |
| Authorize | approved | Approved |
| Scheduled | any | Scheduled |
| Implement | any | Implementation |
| Review | any | Review |
| Closed | any | Closed Complete |
| Canceled | any | Cancelled |

Canonical format: [`data/release-change-state-map.json`](../data/release-change-state-map.json). Edit that file (and the `RELEASE_STATE` values in the Business Rule) to match your instance choice values.

## Deploy

1. Open **System Definition → Business Rules**.
2. New rule on **Change Request** `[change_request]`.
3. **When:** after insert and after update.
4. Condition: `State` changes **or** `Approval` changes.
5. Paste from `syncLinkedReleases();` downward in [`sync_release_state_from_change.js`](sync_release_state_from_change.js).
6. Set `RELEASE_STATE` values to your `rm_release.state` choice values.

Linked Releases are found by `rm_release.change_request`, Change `parent`, or a Record Producer variable named `change_request`.
