// 選用的極簡靜態伺服器（無相依）：node test/serve.js [port]，然後開 http://localhost:8080/
// 遊戲本身不需要伺服器——直接雙擊 index.html（file://）即可。
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), port = +process.argv[2] || 8080;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.md': 'text/markdown; charset=utf-8', '.json': 'application/json' };
http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (e, data) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }); res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`Boss鬥技場：http://localhost:${port}/`));
