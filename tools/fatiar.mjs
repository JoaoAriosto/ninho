// Fatia uma folha de sprites gerada (silhuetas separadas em fundo liso) em PNGs transparentes.
// Uso: node tools/fatiar.mjs <imagem> <pasta-destino> nome1,nome2,...   (ordem: linha por linha, da esquerda para a direita)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

// Com um 4º argumento "4x4", divide a folha numa grade regular (para peças em diagonal ou com brilho,
// cujas caixas se sobrepõem) em vez de procurar as manchas.
const [arquivo, destino, nomesArg, gradeArg] = process.argv.slice(2);
const nomes = (nomesArg ?? '').split(',').filter(Boolean);
fs.mkdirSync(destino, { recursive: true });

const { data, info } = await sharp(arquivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height;

// cor do fundo: mediana das bordas
const borda = [];
for (let x = 0; x < w; x += 7) borda.push([x, 2], [x, h - 3]);
for (let y = 0; y < h; y += 7) borda.push([2, y], [w - 3, y]);
const papel = [0, 1, 2].map((k) => {
  const v = borda.map(([x, y]) => data[(y * w + x) * 4 + k]).sort((a, b) => a - b);
  return v[v.length >> 1];
});
const dist = (i) => Math.hypot(data[i] - papel[0], data[i + 1] - papel[1], data[i + 2] - papel[2]);

const LIMIAR = 60, JUNTA = Number(process.env.FATIAR_JUNTA ?? 14), AREA_MIN = (w * h) / 2500;

// Com FATIAR_VERDE=1, o verde chroma (arma do herói) vira branco, para o jogo pintar com a cor do efeito.
const VERDE = process.env.FATIAR_VERDE === '1';
function pintar(out, o, i, a) {
  const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
  if (VERDE && g > r + 50 && g > b + 50) {
    // brilho do verde vira tom de branco (mantém um pouco do volume)
    const v = Math.min(255, 150 + (g - Math.max(r, b)) * 0.7);
    out[o] = out[o + 1] = out[o + 2] = v;
    out[o + 3] = 255;
    return;
  }
  for (let k = 0; k < 3; k++) out[o + k] = a > 0 ? Math.max(0, Math.min(255, (data[i + k] - papel[k] * (1 - a)) / a)) : 0;
  out[o + 3] = Math.round(a * 255);
}

if (gradeArg) {
  const [cols, lins] = gradeArg.split('x').map(Number);
  const saidaGrade = [];
  for (let r = 0; r < lins; r++)
    for (let c = 0; c < cols; c++) {
      const cx0 = Math.floor((c * w) / cols), cx1 = Math.floor(((c + 1) * w) / cols);
      const cy0 = Math.floor((r * h) / lins), cy1 = Math.floor(((r + 1) * h) / lins);
      // caixa justa do desenho dentro da célula
      let x0 = cx1, y0 = cy1, x1 = cx0, y1 = cy0;
      for (let y = cy0; y < cy1; y++)
        for (let x = cx0; x < cx1; x++)
          if (dist((y * w + x) * 4) >= LIMIAR) {
            x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
          }
      x0 = Math.max(cx0, x0 - 6); y0 = Math.max(cy0, y0 - 6); x1 = Math.min(cx1 - 1, x1 + 6); y1 = Math.min(cy1 - 1, y1 + 6);
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
      const out = Buffer.alloc(cw * ch * 4);
      for (let y = 0; y < ch; y++)
        for (let x = 0; x < cw; x++) {
          const i = ((y + y0) * w + (x + x0)) * 4, o = (y * cw + x) * 4;
          const a = Math.max(0, Math.min(1, (dist(i) - 22) / 90));
          pintar(out, o, i, a);
        }
      const nome = nomes[r * cols + c] ?? `peca-${r * cols + c + 1}`;
      await sharp(out, { raw: { width: cw, height: ch, channels: 4 } }).png().toFile(path.join(destino, `${nome}.png`));
      saidaGrade.push(`${nome} ${cw}x${ch}`);
    }
  console.log(`fundo rgb(${papel.join(',')}) · grade ${gradeArg}`);
  console.log(saidaGrade.join('\n'));
  process.exit(0);
}
const marca = new Int32Array(w * h).fill(-1);
let caixas = [];
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) {
    const k = y * w + x;
    if (marca[k] !== -1 || dist(k * 4) < LIMIAR) continue;
    const c = { x0: x, y0: y, x1: x, y1: y, area: 0 };
    const id = caixas.push(c) - 1;
    const pilha = [k];
    marca[k] = id;
    while (pilha.length) {
      const q = pilha.pop();
      const qx = q % w, qy = (q / w) | 0;
      c.area++;
      c.x0 = Math.min(c.x0, qx); c.x1 = Math.max(c.x1, qx); c.y0 = Math.min(c.y0, qy); c.y1 = Math.max(c.y1, qy);
      for (const n of [q + 1, q - 1, q + w, q - w]) {
        if (n < 0 || n >= w * h || marca[n] !== -1 || Math.abs((n % w) - qx) > 1) continue;
        if (dist(n * 4) < LIMIAR) continue;
        marca[n] = id;
        pilha.push(n);
      }
    }
  }
caixas = caixas.filter((c) => c.area > 15);
for (let mudou = true; mudou; ) {
  mudou = false;
  fora: for (let i = 0; i < caixas.length; i++)
    for (let j = i + 1; j < caixas.length; j++) {
      const a = caixas[i], b = caixas[j];
      if (a.x0 - JUNTA <= b.x1 && b.x0 - JUNTA <= a.x1 && a.y0 - JUNTA <= b.y1 && b.y0 - JUNTA <= a.y1) {
        caixas[i] = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), area: a.area + b.area };
        caixas.splice(j, 1);
        mudou = true;
        break fora;
      }
    }
}
caixas = caixas.filter((c) => c.area >= AREA_MIN);
// ordena por linha (centros verticais próximos) e depois da esquerda para a direita
caixas.sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
const linhas = [];
for (const c of caixas) {
  const cy = (c.y0 + c.y1) / 2;
  const l = linhas.find((l) => Math.abs(l.cy - cy) < h / 6);
  if (l) l.itens.push(c);
  else linhas.push({ cy, itens: [c] });
}
const ordem = linhas.flatMap((l) => l.itens.sort((a, b) => a.x0 - b.x0));

const saida = [];
const ancoras = {};

/** Centro horizontal da cabeça: média x dos pixels opacos nos 12% de cima do desenho. */
function ancoraDaCabeca(buf, cw, ch) {
  let soma = 0, qtd = 0;
  let topo = 0;
  achar: for (; topo < ch; topo++) for (let x = 0; x < cw; x++) if (buf[(topo * cw + x) * 4 + 3] > 200) break achar;
  const ate = Math.min(ch, topo + Math.round(ch * 0.12));
  for (let y = topo; y < ate; y++)
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      // ignora a arma (branca, vinda do verde) para achar só a cabeça preta
      if (buf[i + 3] > 200 && buf[i] < 90) { soma += x; qtd++; }
    }
  return qtd ? Math.round((soma / qtd / cw) * 1000) / 1000 : 0.5;
}
for (let n = 0; n < ordem.length; n++) {
  const c = ordem[n];
  const x0 = Math.max(0, c.x0 - 4), y0 = Math.max(0, c.y0 - 4), x1 = Math.min(w - 1, c.x1 + 4), y1 = Math.min(h - 1, c.y1 + 4);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const i = ((y + y0) * w + (x + x0)) * 4, o = (y * cw + x) * 4;
      const a = Math.max(0, Math.min(1, (dist(i) - 22) / 90));
      pintar(out, o, i, a);
    }
  const nome = nomes[n] ?? `peca-${n + 1}`;
  await sharp(out, { raw: { width: cw, height: ch, channels: 4 } }).png().toFile(path.join(destino, `${nome}.png`));
  ancoras[nome] = ancoraDaCabeca(out, cw, ch);
  saida.push(`${nome} ${cw}x${ch}`);
}
// FATIAR_ANCORAS=arquivo.json: grava, para cada peça, onde fica a cabeça (fração da largura).
// Usar a cabeça como âncora mantém o corpo parado entre quadros de caminhada.
if (process.env.FATIAR_ANCORAS) {
  const arq = process.env.FATIAR_ANCORAS;
  const antes = fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, 'utf8')) : {};
  antes[path.basename(destino)] = { ...(antes[path.basename(destino)] ?? {}), ...ancoras };
  fs.writeFileSync(arq, JSON.stringify(antes, null, 2));
}
console.log(`fundo rgb(${papel.join(',')}) · ${ordem.length} peças`);
console.log(saida.join('\n'));
