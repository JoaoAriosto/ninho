// Monta o ícone do app e as ilustrações a partir dos desenhos recortados da folha do ChatGPT (img/marcos).
// Uso: node tools/compor.mjs
import sharp from 'sharp';
import fs from 'node:fs';

const M = (n) => `img/marcos/${n}.png`;
fs.mkdirSync('img/ilustra', { recursive: true });

async function caber(arq, lado) {
  return sharp(arq).resize(lado, lado, { fit: 'inside' }).toBuffer();
}

async function compor(saida, w, h, fundo, pecas) {
  const camadas = [];
  for (const p of pecas) {
    if (p.circulo) {
      const d = p.circulo.d;
      camadas.push({ input: Buffer.from(`<svg width="${d}" height="${d}"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2}" fill="${p.circulo.cor}"/></svg>`), left: p.x - d / 2, top: p.y - d / 2 });
      continue;
    }
    const buf = await caber(p.arq, p.lado);
    const m = await sharp(buf).metadata();
    camadas.push({ input: buf, left: Math.round(p.x - m.width / 2), top: Math.round(p.y - m.height / 2) });
  }
  await sharp({ create: { width: w, height: h, channels: 4, background: fundo } }).composite(camadas).png().toFile(saida);
  console.log(saida);
}

const transparente = { r: 0, g: 0, b: 0, alpha: 0 };

// ícone do app: rostinho sorrindo sobre círculo creme, fundo caramelo-claro
await compor('img/icone-512.png', 512, 512, '#EADAC2', [
  { circulo: { d: 380, cor: '#F8F0E4' }, x: 256, y: 256 },
  { arq: M('sorriso'), lado: 300, x: 256, y: 262 },
]);
await sharp('img/icone-512.png').resize(192).toFile('img/icone-192.png');
await sharp('img/icone-512.png').resize(180).toFile('img/icone-180.png');

await compor('img/ilustra/avatar.png', 240, 240, transparente, [
  { circulo: { d: 240, cor: '#DCE2D3' }, x: 120, y: 120 },
  { arq: M('sorriso'), lado: 170, x: 120, y: 126 },
]);
await compor('img/ilustra/heroi.png', 420, 380, transparente, [
  { arq: M('noite'), lado: 150, x: 300, y: 90 },
  { arq: M('sentou'), lado: 230, x: 200, y: 250 },
]);
await compor('img/ilustra/boas-vindas.png', 640, 560, transparente, [
  { arq: M('noite'), lado: 170, x: 500, y: 110 },
  { arq: M('outro'), lado: 110, x: 120, y: 120 },
  { arq: M('engatinhou'), lado: 320, x: 320, y: 340 },
  { arq: M('passos'), lado: 110, x: 110, y: 450 },
]);
await compor('img/ilustra/vazio-peso.png', 420, 300, transparente, [
  { arq: M('papinha'), lado: 140, x: 110, y: 200 },
  { arq: M('cabeca'), lado: 230, x: 270, y: 160 },
]);
await compor('img/ilustra/vazio-momentos.png', 420, 300, transparente, [
  { arq: M('palavra'), lado: 130, x: 320, y: 90 },
  { arq: M('gargalhada'), lado: 220, x: 190, y: 180 },
]);
await compor('img/ilustra/vazio-marcos.png', 420, 300, transparente, [
  { arq: M('dente'), lado: 120, x: 90, y: 200 },
  { arq: M('outro'), lado: 200, x: 220, y: 140 },
  { arq: M('passos'), lado: 110, x: 345, y: 215 },
]);
