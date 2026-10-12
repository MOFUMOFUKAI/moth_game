const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
    const target = path.resolve(root, relative);
    const inside = path.relative(root, target);
    if (inside.startsWith('..') || path.isAbsolute(inside) || !/^(index\.html|(?:src|css|assets)[/\\])/.test(relative)) {
      res.writeHead(403).end(); return;
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(target).pipe(res);
  } catch { res.writeHead(400).end(); }
}).listen(4173, '127.0.0.1', () => console.log('MOTHVOID1: http://127.0.0.1:4173'));
