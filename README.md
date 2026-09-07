# copyrelease

A small API for creating and copying release notes.

ServiceNow Change → Release state sync (Decision Table, Business Rules, Script Include) lives in [`servicenow/README.md`](servicenow/README.md).

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

## Tests

```bash
npm test
```
