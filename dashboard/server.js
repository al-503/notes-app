const http = require('http');
const fs = require('fs');
const path = require('path');

const { listNotes } = require('./lib/notes.js');
const { listCommands } = require('./lib/commands.js');
const { runGenerate, killActive } = require('./lib/generate.js');

const REPO_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 4173;

const STATIC_FILES = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/app.js': { file: 'app.js', type: 'application/javascript; charset=utf-8' },
  '/style.css': { file: 'style.css', type: 'text/css; charset=utf-8' },
};

let generating = false;

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/notes') {
      sendJson(res, 200, { notes: listNotes(REPO_ROOT) });
      return;
    }

    if (req.method === 'GET' && req.url === '/api/commands') {
      sendJson(res, 200, { commands: listCommands(REPO_ROOT) });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/generate') {
      if (generating) {
        sendJson(res, 429, { ok: false, error: 'busy' });
        return;
      }

      let body;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        sendJson(res, 400, { ok: false, error: 'invalid_body' });
        return;
      }

      const { notePath, command } = body || {};

      // Revalide contre un re-scan à chaud plutôt qu'une regex anti-traversal :
      // pas de canonicalisation à gérer, pas de piège de symlink.
      const knownNote = listNotes(REPO_ROOT).some((n) => n.path === notePath);
      if (!knownNote) {
        sendJson(res, 400, { ok: false, error: 'unknown_note' });
        return;
      }
      const knownCommand = listCommands(REPO_ROOT).some((c) => c.name === command);
      if (!knownCommand) {
        sendJson(res, 400, { ok: false, error: 'unknown_command' });
        return;
      }

      generating = true;
      try {
        const result = await runGenerate({ repoRoot: REPO_ROOT, command, notePath });
        sendJson(res, 200, { ok: true, result });
      } catch (error) {
        sendJson(res, 500, { ok: false, error: 'generation_failed', detail: error.message });
      } finally {
        generating = false;
      }
      return;
    }

    const staticEntry = STATIC_FILES[req.url];
    if (req.method === 'GET' && staticEntry) {
      const filePath = path.join(PUBLIC_DIR, staticEntry.file);
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': staticEntry.type });
      res.end(content);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  } catch (error) {
    sendJson(res, 500, { ok: false, error: 'internal_error', detail: error.message });
  }
});

// Ne coupe pas une génération en cours (jusqu'à 3 min) avant le timeout du subprocess.
server.requestTimeout = 200000;

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Dashboard prêt → http://127.0.0.1:${PORT}`);
});

process.on('SIGINT', () => {
  killActive();
  server.close(() => process.exit(0));
});
