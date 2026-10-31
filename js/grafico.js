// Gráfico de peso em SVG, com a faixa de referência da OMS (peso para idade, P3–P97, valores arredondados).
const MESES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 21, 24];
const OMS = {
  m: {
    p3: [2.5, 3.4, 4.4, 5.1, 5.6, 6.1, 6.4, 6.7, 7.0, 7.2, 7.5, 7.7, 7.8, 8.4, 8.9, 9.5, 9.8],
    p50: [3.3, 4.5, 5.6, 6.4, 7.0, 7.5, 7.9, 8.3, 8.6, 8.9, 9.2, 9.4, 9.6, 10.3, 10.9, 11.5, 12.2],
    p97: [4.3, 5.7, 7.0, 7.9, 8.6, 9.2, 9.7, 10.2, 10.5, 10.9, 11.2, 11.5, 11.8, 12.7, 13.5, 14.3, 15.1],
  },
  f: {
    p3: [2.4, 3.2, 4.0, 4.6, 5.1, 5.5, 5.8, 6.1, 6.3, 6.6, 6.8, 7.0, 7.1, 7.7, 8.2, 8.8, 9.2],
    p50: [3.2, 4.2, 5.1, 5.8, 6.4, 6.9, 7.3, 7.6, 7.9, 8.2, 8.5, 8.7, 8.9, 9.6, 10.2, 10.9, 11.5],
    p97: [4.2, 5.5, 6.6, 7.5, 8.2, 8.8, 9.3, 9.8, 10.2, 10.5, 10.9, 11.2, 11.5, 12.4, 13.2, 14.0, 14.8],
  },
};

function interpola(serie, m) {
  if (m <= 0) return serie[0];
  for (let i = 1; i < MESES.length; i++)
    if (m <= MESES[i]) {
      const t = (m - MESES[i - 1]) / (MESES[i] - MESES[i - 1]);
      return serie[i - 1] + t * (serie[i] - serie[i - 1]);
    }
  return null;
}

// pontos: [{ x: idade em meses, y: kg, id }]
export function graficoPeso({ pontos, sexo, largura = 340, altura = 220, mini = false }) {
  const ref = OMS[sexo];
  const maxX = Math.max(3, Math.ceil((pontos.at(-1)?.x ?? 0) + (mini ? 0.5 : 1)));
  const xFim = mini ? Math.max(1, (pontos.at(-1)?.x ?? 1) + 0.3) : maxX;
  const xIni = mini ? Math.max(0, (pontos[0]?.x ?? 0) - 0.3) : 0;

  const ys = pontos.map((p) => p.y);
  if (ref && !mini)
    for (let m = xIni; m <= Math.min(xFim, 24); m += 0.5) ys.push(interpola(ref.p3, m), interpola(ref.p97, m));
  let yMin = Math.floor(Math.min(...ys, 99) - (mini ? 0.2 : 0.5));
  let yMax = Math.ceil(Math.max(...ys, 0) + (mini ? 0.2 : 0.5));
  if (!pontos.length && !ref) [yMin, yMax] = [2, 8];
  if (yMax - yMin < 2) yMax = yMin + 2;
  yMin = Math.max(0, yMin);

  const pad = mini ? { e: 6, d: 9, t: 9, b: 8 } : { e: 34, d: 12, t: 14, b: 30 };
  const X = (m) => pad.e + ((m - xIni) / (xFim - xIni)) * (largura - pad.e - pad.d);
  const Y = (kg) => altura - pad.b - ((kg - yMin) / (yMax - yMin)) * (altura - pad.t - pad.b);

  let svg = `<svg class="grafico${mini ? ' mini' : ''}" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Gráfico de peso">
  <defs><linearGradient id="area${mini ? 'M' : 'G'}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="var(--caramelo)" stop-opacity=".28"/><stop offset="1" stop-color="var(--caramelo)" stop-opacity="0"/>
  </linearGradient></defs>`;

  if (!mini) {
    const passoY = yMax - yMin > 8 ? 2 : 1;
    for (let kg = yMin; kg <= yMax; kg += passoY)
      svg += `<line class="grade" x1="${pad.e}" x2="${largura - pad.d}" y1="${Y(kg)}" y2="${Y(kg)}"/><text class="eixo" x="${pad.e - 8}" y="${Y(kg) + 4}" text-anchor="end">${kg}</text>`;
    const passoX = maxX > 12 ? 3 : maxX > 6 ? 2 : 1;
    for (let m = 0; m <= maxX; m += passoX)
      svg += `<text class="eixo" x="${X(m)}" y="${altura - 10}" text-anchor="middle">${m}m</text>`;

    if (ref) {
      const fim = Math.min(xFim, 24), passos = [];
      for (let m = 0; m <= fim + 0.001; m += 0.25) passos.push(m);
      const alto = passos.map((m) => `${X(m)},${Y(interpola(ref.p97, m))}`);
      const baixo = passos.map((m) => `${X(m)},${Y(interpola(ref.p3, m))}`).reverse();
      svg += `<polygon class="faixa" points="${[...alto, ...baixo].join(' ')}"/>`;
      svg += `<polyline class="mediana" points="${passos.map((m) => `${X(m)},${Y(interpola(ref.p50, m))}`).join(' ')}"/>`;
    }
  }

  if (pontos.length) {
    const linha = pontos.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ');
    if (pontos.length > 1)
      svg += `<polygon fill="url(#area${mini ? 'M' : 'G'})" points="${X(pontos[0].x)},${Y(yMin)} ${linha} ${X(pontos.at(-1).x)},${Y(yMin)}"/>
        <polyline class="linha" points="${linha}"/>`;
    pontos.forEach((p, i) => {
      const ultimo = i === pontos.length - 1;
      if (mini && !ultimo) return;
      svg += `<circle class="ponto${ultimo ? ' ultimo' : ''}" data-id="${p.id ?? ''}" cx="${X(p.x)}" cy="${Y(p.y)}" r="${ultimo ? 5.5 : 4}"/>`;
      if (!mini) svg += `<circle class="alvo" data-id="${p.id ?? ''}" cx="${X(p.x)}" cy="${Y(p.y)}" r="16"/>`;
    });
  }
  return svg + '</svg>';
}
