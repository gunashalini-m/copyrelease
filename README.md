# copyrelease

A small API for creating and copying release notes, plus a ServiceNow **Release ↔ Change state mapping**.

When a Change is in **Authorize** or **Authorize Approval**, the Release is set to **Awaiting Approval**. Implemented states map to **Deploy/Launch**; Closed variants map as in Decision Table **Release to Change state mapping**. Only **Release.parent** is used.

Paste-ready Change Business Rule: [`servicenow/sync_release_state_from_change.js`](servicenow/sync_release_state_from_change.js).

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
- `POST /release-change-state-map/resolve` — next Release state from `{ "parentChangeNumber", "changeState", "changeApproval", "currentReleaseState" }`

## Tests

```bash
npm test
```
