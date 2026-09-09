import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOPICS } from '../src/lib/questions/index.js';
import {
  SNOW_CLASSES,
  SNOW_GLOBALS,
  SNOW_NAMESPACES,
  SNOW_SNIPPETS,
  SNOW_TABLES,
} from '../src/lib/snow-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function serialize(value) {
  return JSON.stringify(
    value,
    (_key, item) => {
      if (item instanceof RegExp) {
        return { __regex: true, source: item.source, flags: item.flags };
      }
      return item;
    },
    0,
  ).replace(/</g, '\\u003c');
}

const css = fs.readFileSync(path.join(root, 'public/css/app.css'), 'utf8')
  + `
body { font-family: system-ui, sans-serif; }
.editor {
  position: relative;
  height: min(48vh, 460px);
}
#code {
  width: 100%;
  height: 100%;
  resize: none;
  background: #0d1f1c;
  color: var(--text);
  border: 0;
  padding: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 14px;
  line-height: 1.45;
  outline: none;
}
#ac-menu {
  position: absolute;
  left: 12px;
  bottom: 12px;
  max-height: 220px;
  overflow: auto;
  min-width: 280px;
  background: #12302b;
  border: 1px solid #2f7a64;
  border-radius: 8px;
  box-shadow: var(--shadow);
  z-index: 5;
}
.ac-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  text-align: left;
  background: transparent;
  color: var(--text);
  padding: 8px 10px;
  border: 0;
  font: inherit;
  cursor: pointer;
}
.ac-item span {
  color: var(--muted);
  font-size: 12px;
}
.ac-item.active, .ac-item:hover {
  background: #1a4a3d;
}
.save-note {
  margin: 0 16px 8px;
  font-size: 12px;
  color: var(--muted);
}
`;

const client = fs.readFileSync(path.join(root, 'src/standalone/client.js'), 'utf8');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ServiceNow ITSM Script Lab</title>
  <style>${css}</style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <div class="logo">SN</div>
        <div>
          <strong>ITSM Script Lab</strong>
          <p>Practice · Autocomplete · Instant grade</p>
        </div>
      </div>
      <p class="save-note">Offline file — double-click to open. Progress stays in this browser.</p>
      <div id="topic-nav" class="topic-nav"></div>
    </aside>
    <section class="mid">
      <header class="mid-head">
        <p id="blurb" class="muted"></p>
        <p id="progress-label" class="progress"></p>
      </header>
      <div id="question-list" class="question-list"></div>
    </section>
    <main class="main">
      <header class="main-head">
        <div>
          <p id="crumb" class="crumb"></p>
          <h1 id="q-title"></h1>
        </div>
        <div class="actions">
          <button id="reset-btn" class="btn ghost" type="button">Reset</button>
          <button id="reveal-btn" class="btn ghost" type="button">Show solution</button>
          <button id="apply-btn" class="btn ghost" type="button">Copy solution into editor</button>
          <button id="grade-btn" class="btn primary" type="button">Grade</button>
        </div>
      </header>
      <p id="q-prompt" class="prompt"></p>
      <p id="hint" class="hint" hidden></p>
      <div id="editor" class="editor">
        <textarea id="code" spellcheck="false" autocomplete="off"></textarea>
        <div id="ac-menu" hidden></div>
      </div>
      <section id="grade-results" class="grade-box"></section>
      <section id="solution-pane" class="solution" hidden>
        <h2>Reference solution</h2>
        <pre id="solution-code"></pre>
      </section>
    </main>
  </div>
  <script>
    const TOPICS = ${serialize(TOPICS)};
    const SNOW_API = {
      classes: ${serialize(SNOW_CLASSES)},
      globals: ${serialize(SNOW_GLOBALS)},
      namespaces: ${serialize(SNOW_NAMESPACES)},
      snippets: ${serialize(SNOW_SNIPPETS)},
      tables: ${serialize(SNOW_TABLES)}
    };
  </script>
  <script>
${client}
  </script>
</body>
</html>
`;

const outPublic = path.join(root, 'public/servicenow-itsm-lab.html');
const outRoot = path.join(root, 'servicenow-itsm-lab.html');
fs.writeFileSync(outPublic, html);
fs.writeFileSync(outRoot, html);
console.log(`Wrote ${outRoot} (${Buffer.byteLength(html)} bytes)`);
