// Recebe as imagens geradas no ChatGPT (POST /nome.png) e grava em arte-fonte/. Só escuta no próprio notebook.
// Uso: node tools/receber.mjs   (porta 5917)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const pasta = path.resolve('arte-fonte');
fs.mkdirSync(pasta, { recursive: true });

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.end();
  // página-ponte: a aba do ChatGPT abre esta janela e manda a imagem por postMessage
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`<p>recebendo…</p><script>
      addEventListener('message', async (e) => {
        if (e.origin !== 'https://chatgpt.com') return;
        const r = await fetch('/' + e.data.nome, { method: 'POST', body: e.data.blob });
        e.source.postMessage({ nome: e.data.nome, ok: await r.text() }, e.origin);
        document.body.textContent = 'gravado ' + e.data.nome;
      });
      opener && opener.postMessage('pronto', 'https://chatgpt.com');
    </script>`);
  }
  const nome = path.basename(decodeURIComponent(req.url)).replace(/[^\w.-]/g, '');
  if (req.method !== 'POST' || !/\.png$/.test(nome)) { res.statusCode = 400; return res.end('nao'); }
  const partes = [];
  req.on('data', (c) => partes.push(c));
  req.on('end', () => {
    fs.writeFileSync(path.join(pasta, nome), Buffer.concat(partes));
    console.log('gravado', nome, Buffer.concat(partes).length);
    res.end('ok');
  });
}).listen(5917, '127.0.0.1', () => console.log('ouvindo 5917'));
