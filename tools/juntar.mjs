// Junta os pedaços capturados da tela do ChatGPT (quadrantes em ordem: linha por linha) numa imagem só.
// Uso: node tools/juntar.mjs <saida.png> <colunas> <q1.png> <q2.png> ...
import sharp from 'sharp';
const [saida, colsArg, ...pecas] = process.argv.slice(2);
const cols = Number(colsArg);
const metas = await Promise.all(pecas.map((p) => sharp(p).metadata()));
const w = metas[0].width, h = metas[0].height, lins = Math.ceil(pecas.length / cols);
await sharp({ create: { width: w * cols, height: h * lins, channels: 3, background: '#F6EFE4' } })
  .composite(pecas.map((p, i) => ({ input: p, left: (i % cols) * w, top: Math.floor(i / cols) * h })))
  .png().toFile(saida);
console.log(saida, w * cols, 'x', h * lins);
