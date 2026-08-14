# copyrelease

A small API for creating and copying release notes.

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
