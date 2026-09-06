# copyrelease

A small API for creating and copying release notes, plus a ServiceNow **Release ↔ Change state mapping**.

When a Change is in **Authorize** or **Approval** and is not approved yet, the Release is set to **Awaiting Approval**. Other Change states map the same way. The only Change used is **Release.parent**. No parent means the Release is not linked, so it stays **Draft**. The mapping is a ServiceNow **Decision Table**, called from two thin Business Rules.

Format: [`data/release-change-state-map.json`](data/release-change-state-map.json). Decision Table + Script Include: [`servicenow/README.md`](servicenow/README.md).

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
