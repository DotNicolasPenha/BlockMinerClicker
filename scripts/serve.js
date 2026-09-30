#!/usr/bin/env node
/* Dev server com livereload e bypass do service worker. Uso: npm run dev */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 5173;
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8'
};

const LR_SNIPPET = `
<script>
/* dev: livereload (apenas no servidor de desenvolvimento) */
(function () {
  var es = new EventSource('/__events');
  es.addEventListener('reload', function () {
    var keep = new URLSearchParams(location.search).has('keepsw');
    (async function () {
      if (!keep && 'serviceWorker' in navigator) {
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function (r) { return r.unregister(); }));
        if (self.caches) {
          var keys = await caches.keys();
          await Promise.all(keys.map(function (k) { return caches.delete(k); }));
        }
      }
      location.reload();
    })();
  });
})();
</script>`;

const clients = new Set();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));

  if (url.pathname === '/__events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('403');
    return;
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 Not Found');
    return;
  }

  const ext = path.extname(file).toLowerCase();
  let body = fs.readFileSync(file);
  if (ext === '.html') {
    const html = body.toString('utf8');
    const idx = html.toLowerCase().lastIndexOf('</body>');
    const injected = idx === -1 ? html + LR_SNIPPET : html.slice(0, idx) + LR_SNIPPET + html.slice(idx);
    body = Buffer.from(injected, 'utf8');
  }

  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
    'Content-Length': body.length
  });
  res.end(body);
});

function broadcast() {
  for (const c of clients) c.write('event: reload\ndata: now\n\n');
}

let timer = null;
function onChange(file) {
  const name = file ? String(file) : '';
  if (name.startsWith('.git') || name.startsWith('node_modules')) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log('[reload] ' + (name || 'arquivo alterado'));
    broadcast();
  }, 120);
}

try {
  fs.watch(ROOT, { recursive: true }, (event, file) => onChange(file));
} catch (e) {
  fs.watch(path.join(ROOT, 'index.html'), () => onChange('index.html'));
}

server.listen(PORT, HOST, () => {
  console.log('Block Miner Clicker — dev server');
  console.log('  local:  http://' + HOST + ':' + PORT + '/');
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log('  rede:   http://' + net.address + ':' + PORT + '/  (teste no celular)');
      }
    }
  }
  console.log('  ?keepsw=1 mantém o service worker para testar o modo offline');
});
