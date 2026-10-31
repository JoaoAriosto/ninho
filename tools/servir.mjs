// Servidor simples para testar o app no notebook. Uso: node tools/servir.mjs [porta] [pasta do app]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(process.argv[3] ?? ".");
const porta = Number(process.argv[2] ?? 5180);
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };

http.createServer((req, res) => {
  let arq = path.join(raiz, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!arq.startsWith(raiz)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(arq) && fs.statSync(arq).isDirectory()) arq = path.join(arq, 'index.html');
  if (!fs.existsSync(arq)) { res.statusCode = 404; return res.end('não achei'); }
  res.setHeader('Content-Type', tipos[path.extname(arq)] ?? 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(arq).pipe(res);
}).listen(porta, () => console.log(`Ninho em http://localhost:${porta}`));
