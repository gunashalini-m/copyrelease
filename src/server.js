import express from 'express';
import { defaultMapper, loadStateMap } from './releaseChangeStateMap.js';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

const releases = new Map();
let nextId = 1;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'copyrelease' });
});

app.get('/releases', (_req, res) => {
  res.json(Array.from(releases.values()));
});

app.get('/release-change-state-map', (_req, res) => {
  res.json(loadStateMap());
});

app.post('/release-change-state-map/resolve', (req, res) => {
  const { parentChangeNumber, parent, changeState, changeApproval, currentReleaseState } =
    req.body ?? {};
  res.json(
    defaultMapper.nextReleaseState(
      { parentChangeNumber: parentChangeNumber ?? parent, changeState, changeApproval },
      currentReleaseState,
    ),
  );
});

app.post('/releases', (req, res) => {
  const { title, body } = req.body ?? {};

  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  const release = {
    id: nextId++,
    title,
    body,
    createdAt: new Date().toISOString(),
  };

  releases.set(release.id, release);
  res.status(201).json(release);
});

app.post('/releases/:id/copy', (req, res) => {
  const source = releases.get(Number(req.params.id));

  if (!source) {
    return res.status(404).json({ error: 'release not found' });
  }

  const copy = {
    id: nextId++,
    title: `${source.title} (copy)`,
    body: source.body,
    copiedFrom: source.id,
    createdAt: new Date().toISOString(),
  };

  releases.set(copy.id, copy);
  res.status(201).json(copy);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`copyrelease listening on http://0.0.0.0:${port}`);
});
