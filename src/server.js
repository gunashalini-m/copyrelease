import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT) || 3000;

const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'servicenow-itsm-lab' });
});

app.use('/lib', express.static(path.join(root, 'src/lib')));
app.use(express.static(path.join(root, 'public')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/lib')) {
    return next();
  }
  res.sendFile(path.join(root, 'public/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`ServiceNow ITSM Lab listening on http://0.0.0.0:${port}`);
});
