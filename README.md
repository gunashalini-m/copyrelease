# copyrelease

A small API for creating and copying release notes, plus a ServiceNow **Release ↔ Change state mapping**.

When a Change is in **Authorize** (or **Approval**) and approval is still pending, the linked Release is set to **Awaiting Approval**. Other Change states map the same way. The mapping is re-applied whenever the Change state or approval changes, including when the Change moves backward.

Canonical mapping: [`data/release-change-state-map.json`](data/release-change-state-map.json). Deploy the after Business Rule from [`servicenow/sync_release_state_from_change.js`](servicenow/sync_release_state_from_change.js). See [`servicenow/README.md`](servicenow/README.md).

## Development

```bash
npm ci
npm run dev
```

The server listens on port 3000 by default.

## API

- `GET /health` — health check
- `GET /releases` — list releases
- `POST /releases` — create a release (`{ "title": "...", "body": "..." }`)
- `POST /releases/:id/copy` — copy an existing release
- `GET /release-change-state-map` — Release ↔ Change state mapping format
- `POST /release-change-state-map/resolve` — project Release state from `{ "changeState", "changeApproval", "currentReleaseState" }`

## Tests

```bash
npm test
```
