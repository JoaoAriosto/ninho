import { db, novoId } from './db.js';
import { graficoPeso } from './grafico.js';
import { MARCOS, marcoPorTipo, imgMarco } from './marcos.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (t = '') => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const estado = { aba: 'inicio', perfil: null, pesos: [], fotos: [], marcos: [] };
const urls = new Map(); // id da foto -> object URL (miniatura e grande)

// ---------- datas ----------
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const lerData = (s) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
const MESES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dataCurta = (s) => { const d = lerData(s); return `${d.getDate()} ${MESES_NOME[d.getMonth()].slice(0, 3)}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`; };
const dataLonga = (s) => { const d = lerData(s); return `${d.getDate()} de ${MESES_NOME[d.getMonth()]} de ${d.getFullYear()}`; };
const mesAno = (s) => { const d = lerData(s); return `${MESES_NOME[d.getMonth()][0].toUpperCase()}${MESES_NOME[d.getMonth()].slice(1)} de ${d.getFullYear()}`; };
const idadeMeses = (dia) => (lerData(dia) - lerData(estado.perfil.nascimento)) / 864e5 / 30.4375;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function idade(dia = hoje()) {
  const n = lerData(estado.perfil.nascimento), d = lerData(dia);
  let meses = (d.getFullYear() - n.getFullYear()) * 12 + d.getMonth() - n.getMonth();
  let dias = d.getDate() - n.getDate();
  if (dias < 0) { meses--; dias += new Date(d.getFullYear(), d.getMonth(), 0).getDate(); }
  if (meses < 0) return 'antes do nascimento';
  if (meses === 0) {
    if (dias === 0) return 'dia do nascimento';
    return dias >= 7 && dias % 7 === 0 ? plural(dias / 7, 'semana', 'semanas') : plural(dias, 'dia', 'dias');
  }
  if (meses < 24) return plural(meses, 'mês', 'meses') + (dias ? ` e ${plural(dias, 'dia', 'dias')}` : '');
  const anos = Math.floor(meses / 12), resto = meses % 12;
  return plural(anos, 'ano', 'anos') + (resto ? ` e ${plural(resto, 'mês', 'meses')}` : '');
}

const kg = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
function variacao(atual, antes) {
  const g = Math.round((atual - antes) * 1000);
  return `<span class="variacao${g < 0 ? ' baixa' : ''}">${g >= 0 ? '+' : '−'}${Math.abs(g).toLocaleString('pt-BR')} g</span>`;
}

// ---------- fotos ----------
async function reduzir(arquivo, lado) {
  const bmp = await createImageBitmap(arquivo, { imageOrientation: 'from-image' }).catch(() => null);
  const fonte = bmp ?? (await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = URL.createObjectURL(arquivo); }));
  const w = fonte.width, h = fonte.height, k = Math.min(1, lado / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(fonte, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.86));
}

async function guardarFoto(arquivo, dados) {
  const foto = { id: novoId(), data: dados.data, legenda: dados.legenda ?? '', origem: dados.origem, ref: dados.ref ?? null,
    grande: await reduzir(arquivo, 1800), mini: await reduzir(arquivo, 480) };
  await db.salvar('fotos', foto);
  return foto.id;
}

function url(id, tamanho = 'mini') {
  const chave = id + tamanho;
  if (!urls.has(chave)) {
    const f = estado.fotos.find((x) => x.id === id);
    if (!f) return '';
    urls.set(chave, URL.createObjectURL(f[tamanho]));
  }
  return urls.get(chave);
}

// ---------- carregar ----------
async function carregar() {
  estado.perfil = (await db.pegar('kv', 'perfil')) ?? null;
  estado.pesos = (await db.todos('pesos')).sort((a, b) => a.data.localeCompare(b.data));
  estado.fotos = (await db.todos('fotos')).sort((a, b) => b.data.localeCompare(a.data));
  estado.marcos = (await db.todos('marcos')).sort((a, b) => b.data.localeCompare(a.data));
}

// ---------- telas ----------
const telas = {
  inicio() {
    const p = estado.perfil, pesos = estado.pesos, ult = pesos.at(-1), ant = pesos.at(-2);
    const hora = new Date().getHours();
    const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    const avatar = p.fotoId ? url(p.fotoId) : 'img/ilustra/avatar.png';
    const pontos = pesos.map((x) => ({ x: idadeMeses(x.data), y: x.kg, id: x.id }));
    const proximos = MARCOS.filter((m) => m.tipo !== 'outro' && !estado.marcos.some((x) => x.tipo === m.tipo))
      .sort((a, b) => Math.abs(a.mes - idadeMeses(hoje())) - Math.abs(b.mes - idadeMeses(hoje()))).slice(0, 3);

    return `
    <div class="cabeca entra">
      <div><p class="sobretitulo">${saudacao}</p></div>
      <button class="botao-icone" data-acao="ajustes" aria-label="Ajustes"><img src="img/ui/ajustes.png" alt=""></button>
    </div>
    <section class="heroi entra">
      <img class="ilustra" src="img/ilustra/heroi.png" alt="">
      <img class="avatar" src="${avatar}" alt="">
      <h1>${esc(p.nome)}</h1>
      <span class="selo">${idade()}</span>
    </section>

    <div class="secao"><h2>Crescimento</h2><a href="#" data-ir="peso">Ver tudo</a></div>
    ${ult ? `
      <div class="cartao metrica entra" data-ir="peso">
        <div>
          <div class="rotulo">Último peso · ${dataCurta(ult.data)}</div>
          <div class="valor">${kg(ult.kg)}<small>kg</small></div>
          ${ant ? variacao(ult.kg, ant.kg) + `<span class="nota" style="margin-left:6px">desde ${dataCurta(ant.data)}</span>` : '<span class="nota">primeira pesagem</span>'}
        </div>
        <div>${graficoPeso({ pontos, sexo: p.sexo, largura: 180, altura: 100, mini: true })}</div>
      </div>
      ${ult.cm || pesos.length > 1 ? `<div class="dupla">
        <div class="cartao"><div class="rotulo nota" style="margin:0">Altura</div><div class="valor" style="font-family:var(--serif)">${ult.cm ? ult.cm.toLocaleString('pt-BR') + '<small style="font-size:13px"> cm</small>' : '—'}</div></div>
        <div class="cartao"><div class="rotulo nota" style="margin:0">Pesagens</div><div class="valor" style="font-family:var(--serif)">${pesos.length}</div></div>
      </div>` : ''}` : `
      <div class="cartao entra" style="display:flex;gap:14px;align-items:center">
        <img src="img/ilustra/vazio-peso.png" alt="" style="width:86px;mix-blend-mode:multiply">
        <div style="flex:1"><b>Primeira pesagem</b><div class="nota" style="margin:4px 0 0">Anote o peso para começar o gráfico.</div></div>
      </div>`}
    <button class="acao" data-acao="novo-peso">Registrar pesagem</button>

    <div class="secao"><h2>Momentos</h2>${estado.fotos.length ? '<a href="#" data-ir="momentos">Ver todos</a>' : ''}</div>
    ${estado.fotos.length ? `<div class="trilho">${estado.fotos.slice(0, 10).map((f) => `<button data-foto="${f.id}"><img src="${url(f.id)}" alt="${esc(f.legenda)}" loading="lazy"></button>`).join('')}</div>`
      : `<button class="cartao" data-acao="nova-foto" style="display:flex;gap:14px;align-items:center;width:100%;text-align:left">
          <img src="img/ilustra/vazio-momentos.png" alt="" style="width:86px;mix-blend-mode:multiply">
          <div><b>Guarde a primeira foto</b><div class="nota" style="margin:4px 0 0">Coisas novas, caretas, o dia da pesagem…</div></div></button>`}

    <div class="secao"><h2>Próximos marcos</h2><a href="#" data-ir="marcos">Ver todos</a></div>
    <div class="sugestoes">${proximos.map((m) => `<button class="sugestao" data-marco-novo="${m.tipo}"><img src="${imgMarco(m.tipo)}" alt="">${m.titulo}</button>`).join('')}</div>`;
  },

  peso() {
    const p = estado.perfil, pesos = estado.pesos;
    const pontos = pesos.map((x) => ({ x: idadeMeses(x.data), y: x.kg, id: x.id }));
    const lista = [...pesos].reverse();
    return `
    <div class="cabeca entra"><div><p class="sobretitulo">Acompanhamento</p><h1>Peso</h1></div>
      <button class="botao-icone" data-acao="novo-peso" aria-label="Nova pesagem"><img src="img/ui/mais.png" alt=""></button></div>
    ${pesos.length ? `
    <div class="cartao entra">
      ${graficoPeso({ pontos, sexo: p.sexo })}
      <div class="legenda"><span><i style="background:var(--caramelo)"></i>${esc(p.nome)}</span>${p.sexo ? '<span><i style="background:var(--salvia);opacity:.35"></i>Faixa OMS (P3–P97)</span><span><i style="background:none;border-top:2px dashed var(--salvia);height:0"></i>Média</span>' : ''}</div>
    </div>
    ${p.sexo ? '<p class="nota">A faixa é a referência da OMS de peso por idade, só para orientação. Quem avalia o crescimento é o pediatra.</p>' : '<p class="nota">Informe nos ajustes se é menino ou menina para ver a faixa de referência da OMS.</p>'}
    <div class="secao"><h2>Pesagens</h2></div>
    <div class="lista entra">${lista.map((x, i) => `
      <button class="item" data-peso="${x.id}">
        ${x.fotoId ? `<img class="miniatura" src="${url(x.fotoId)}" alt="">` : '<span class="miniatura vazia"><img src="img/ui/peso.png" alt=""></span>'}
        <span class="texto"><span class="titulo">${dataCurta(x.data)}${lerData(x.data).getFullYear() === new Date().getFullYear() ? ' ' + x.data.slice(0, 4) : ''}</span><span class="sub" style="display:block">${idade(x.data)}${x.cm ? ` · ${x.cm.toLocaleString('pt-BR')} cm` : ''}</span></span>
        <span class="direita"><span class="kg">${kg(x.kg)}</span><span class="sub" style="display:block">${lista[i + 1] ? variacao(x.kg, lista[i + 1].kg) : 'kg'}</span></span>
      </button>`).join('')}</div>`
    : vazio('vazio-peso', 'Nenhuma pesagem ainda', 'Anote o peso a cada consulta ou na farmácia e acompanhe a curva de crescimento.', 'novo-peso', 'Registrar pesagem')}`;
  },

  momentos() {
    const grupos = {};
    for (const f of estado.fotos) (grupos[f.data.slice(0, 7)] ??= []).push(f);
    return `
    <div class="cabeca entra"><div><p class="sobretitulo">Álbum</p><h1>Momentos</h1></div>
      <button class="botao-icone" data-acao="nova-foto" aria-label="Nova foto"><img src="img/ui/mais.png" alt=""></button></div>
    ${estado.fotos.length ? Object.entries(grupos).map(([mes, fs]) => `
      <h3 class="mes">${mesAno(mes + '-01')}</h3>
      <div class="mosaico">${fs.map((f) => `<button data-foto="${f.id}"><img src="${url(f.id)}" alt="${esc(f.legenda)}" loading="lazy">${f.legenda ? `<span class="rotulo">${esc(f.legenda)}</span>` : ''}</button>`).join('')}</div>`).join('')
    : vazio('vazio-momentos', 'O álbum está vazio', 'Guarde as fotos das pesagens e de cada coisa nova que acontecer.', 'nova-foto', 'Adicionar foto')}`;
  },

  marcos() {
    const feitos = estado.marcos;
    const faltam = MARCOS.filter((m) => m.tipo !== 'outro' && !feitos.some((x) => x.tipo === m.tipo)).sort((a, b) => a.mes - b.mes);
    return `
    <div class="cabeca entra"><div><p class="sobretitulo">Desenvolvimento</p><h1>Marcos</h1></div>
      <button class="botao-icone" data-acao="novo-marco" aria-label="Novo marco"><img src="img/ui/mais.png" alt=""></button></div>
    ${feitos.length ? `<div class="linha-tempo entra">${feitos.map((m) => `
      <button class="marco" data-marco="${m.id}">
        <span class="medalha">${m.fotoId ? `<img class="foto" src="${url(m.fotoId)}" alt="">` : `<img src="${imgMarco(m.tipo)}" alt="">`}</span>
        <span class="corpo"><span class="titulo" style="display:block">${esc(m.titulo)}</span><span class="sub" style="display:block">${dataLonga(m.data)} · ${idade(m.data)}</span>${m.nota ? `<span class="sub" style="display:block;margin-top:6px;color:var(--tinta)">${esc(m.nota)}</span>` : ''}</span>
      </button>`).join('')}</div>`
    : vazio('vazio-marcos', 'Cada conquista conta', 'O primeiro sorriso, o primeiro dente, a primeira palavra. Toque numa sugestão para registrar.', null)}
    <div class="secao"><h2>${feitos.length ? 'Ainda por vir' : 'Sugestões'}</h2></div>
    <div class="sugestoes">${[...faltam, marcoPorTipo('outro')].map((m) => `<button class="sugestao" data-marco-novo="${m.tipo}"><img src="${imgMarco(m.tipo)}" alt="">${m.tipo === 'outro' ? 'Outro marco' : m.titulo}</button>`).join('')}</div>`;
  },
};

function vazio(img, titulo, texto, acao, rotulo) {
  return `<div class="vazio entra"><img src="img/ilustra/${img}.png" alt=""><h2>${titulo}</h2><p>${texto}</p>${acao ? `<button class="acao" data-acao="${acao}" style="max-width:300px;margin:20px auto 0">${rotulo}</button>` : ''}</div>`;
}

function boasVindas() {
  $('#abas').classList.add('oculta');
  $('#tela').innerHTML = `
  <div class="boas-vindas entra">
    <img class="ilustra" src="img/ilustra/boas-vindas.png" alt="">
    <h1>Bem-vindo ao <em>Ninho</em></h1>
    <p class="lead">O diário do crescimento do seu bebê: peso, fotos e cada conquista, guardados aqui no celular.</p>
    <button class="acao" data-acao="perfil">Começar</button>
  </div>`;
}

function render() {
  if (!estado.perfil) return boasVindas();
  $('#abas').classList.remove('oculta');
  $('#tela').innerHTML = telas[estado.aba]();
  $$('.aba').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === estado.aba));
}

function ir(aba) {
  estado.aba = aba;
  render();
  window.scrollTo({ top: 0 });
}

// ---------- folha (formulários) ----------
function abrirFolha(html, montar) {
  const f = $('#folha');
  f.innerHTML = `<div class="alca"></div>${html}`;
  f.scrollTop = 0;
  $('#folha-fundo').classList.add('aberta');
  f.classList.add('aberta');
  montar?.(f);
}
function fecharFolha() {
  $('#folha').classList.remove('aberta');
  $('#folha-fundo').classList.remove('aberta');
}

function aviso(texto) {
  const a = $('#aviso');
  a.textContent = texto;
  a.classList.add('mostra');
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => a.classList.remove('mostra'), 2200);
}

function campoFoto(fotoId, rotulo = 'Adicionar foto') {
  return `<label class="foto-campo">${fotoId ? `<img class="previa" src="${url(fotoId)}" alt="">` : ''}
    <img class="icone" src="img/ui/foto.png" alt=""><span>${fotoId ? 'Trocar foto' : rotulo}</span>
    <input type="file" accept="image/*" name="foto"></label>`;
}
function previaFoto(f) {
  const input = $('input[name=foto]', f);
  input?.addEventListener('change', () => {
    const arq = input.files[0];
    if (!arq) return;
    const campo = input.closest('.foto-campo');
    let img = $('.previa', campo);
    if (!img) { img = document.createElement('img'); img.className = 'previa'; campo.prepend(img); }
    img.src = URL.createObjectURL(arq);
  });
}

async function trocarFoto(form, atual, dados) {
  const arq = form.foto?.files[0];
  if (!arq) return atual ?? null;
  if (atual) await db.apagar('fotos', atual);
  return guardarFoto(arq, dados);
}

function formPerfil() {
  const p = estado.perfil ?? { nome: '', nascimento: '', sexo: '' };
  abrirFolha(`
    <h2>${estado.perfil ? 'Dados do bebê' : 'Quem é o bebê?'}</h2>
    <form id="f">
      ${campoFoto(p.fotoId, 'Foto do bebê')}
      <label class="campo" style="margin-top:14px"><span>Nome</span><input name="nome" required value="${esc(p.nome)}" placeholder="Como ele ou ela se chama" autocomplete="off"></label>
      <label class="campo"><span>Data de nascimento</span><input name="nascimento" type="date" required max="${hoje()}" value="${p.nascimento}"></label>
      <div class="campo"><span>Sexo (para a curva da OMS)</span><div class="escolha">
        <label><input type="radio" name="sexo" value="f" ${p.sexo === 'f' ? 'checked' : ''}><span>Menina</span></label>
        <label><input type="radio" name="sexo" value="m" ${p.sexo === 'm' ? 'checked' : ''}><span>Menino</span></label>
      </div></div>
      <button class="acao">Salvar</button>
    </form>`, (f) => {
    previaFoto(f);
    $('#f', f).onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      const novo = { nome: form.nome.value.trim(), nascimento: form.nascimento.value, sexo: form.sexo.value };
      novo.fotoId = await trocarFoto(form, p.fotoId, { data: hoje(), origem: 'perfil', legenda: '' });
      await db.salvar('kv', novo, 'perfil');
      await carregar();
      fecharFolha();
      render();
    };
  });
}

function formPeso(id) {
  const x = estado.pesos.find((p) => p.id === id) ?? { data: hoje(), kg: '', cm: '', nota: '' };
  abrirFolha(`
    <h2>${id ? 'Editar pesagem' : 'Nova pesagem'}</h2>
    <form id="f">
      <label class="campo grande"><span>Peso (kg)</span><input name="kg" inputmode="decimal" required placeholder="0,000" value="${x.kg ? String(x.kg).replace('.', ',') : ''}"></label>
      <div class="lado">
        <label class="campo"><span>Data</span><input name="data" type="date" required max="${hoje()}" value="${x.data}"></label>
        <label class="campo"><span>Altura (cm)</span><input name="cm" inputmode="decimal" placeholder="opcional" value="${x.cm ? String(x.cm).replace('.', ',') : ''}"></label>
      </div>
      ${campoFoto(x.fotoId, 'Foto do dia da pesagem')}
      <label class="campo" style="margin-top:14px"><span>Observação</span><textarea name="nota" placeholder="Consulta, pediatra, como estava…">${esc(x.nota)}</textarea></label>
      <button class="acao">Salvar</button>
      ${id ? '<button type="button" class="acao perigo" id="apagar">Apagar pesagem</button>' : ''}
    </form>`, (f) => {
    previaFoto(f);
    $('#f', f).onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      let peso = Number(form.kg.value.replace(',', '.'));
      if (peso > 50) peso /= 1000; // digitou em gramas
      if (!(peso > 0)) return aviso('Confira o peso');
      const cm = Number(form.cm.value.replace(',', '.')) || null;
      const reg = { id: id ?? novoId(), data: form.data.value, kg: peso, cm, nota: form.nota.value.trim() };
      reg.fotoId = await trocarFoto(form, x.fotoId, { data: reg.data, origem: 'peso', ref: reg.id, legenda: `Pesagem · ${kg(peso)} kg` });
      await db.salvar('pesos', reg);
      await carregar();
      fecharFolha();
      render();
      aviso(id ? 'Pesagem atualizada' : 'Pesagem registrada');
    };
    $('#apagar', f)?.addEventListener('click', async () => {
      if (!confirm('Apagar esta pesagem?')) return;
      if (x.fotoId) await db.apagar('fotos', x.fotoId);
      await db.apagar('pesos', id);
      await carregar(); fecharFolha(); render();
    });
  });
}

function formFoto() {
  abrirFolha(`
    <h2>Novo momento</h2>
    <form id="f">
      ${campoFoto(null, 'Escolher ou tirar foto')}
      <label class="campo" style="margin-top:14px"><span>O que aconteceu?</span><input name="legenda" placeholder="Primeiro passeio no parque" autocomplete="off"></label>
      <label class="campo"><span>Data</span><input name="data" type="date" required max="${hoje()}" value="${hoje()}"></label>
      <button class="acao">Guardar</button>
    </form>`, (f) => {
    previaFoto(f);
    $('#f', f).onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target, arq = form.foto.files[0];
      if (!arq) return aviso('Escolha uma foto');
      await guardarFoto(arq, { data: form.data.value, legenda: form.legenda.value.trim(), origem: 'momento' });
      await carregar(); fecharFolha();
      estado.aba = 'momentos'; render();
      aviso('Foto guardada');
    };
  });
}

function formMarco({ id, tipo }) {
  const x = estado.marcos.find((m) => m.id === id) ?? { tipo: tipo ?? 'outro', titulo: tipo && tipo !== 'outro' ? marcoPorTipo(tipo).titulo : '', data: hoje(), nota: '' };
  abrirFolha(`
    <div style="display:flex;justify-content:center;margin-bottom:6px"><img src="${imgMarco(x.tipo)}" alt="" style="width:76px;mix-blend-mode:multiply"></div>
    <h2 style="text-align:center">${id ? 'Editar marco' : 'Novo marco'}</h2>
    <form id="f">
      <label class="campo"><span>Marco</span><input name="titulo" required value="${esc(x.titulo)}" placeholder="Ex.: falou “mamã”" autocomplete="off"></label>
      <label class="campo"><span>Quando</span><input name="data" type="date" required max="${hoje()}" value="${x.data}"></label>
      <label class="campo"><span>Como foi</span><textarea name="nota" placeholder="Conte os detalhes para lembrar depois">${esc(x.nota)}</textarea></label>
      ${campoFoto(x.fotoId)}
      <button class="acao">Salvar</button>
      ${id ? '<button type="button" class="acao perigo" id="apagar">Apagar marco</button>' : ''}
    </form>`, (f) => {
    previaFoto(f);
    $('#f', f).onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      const reg = { id: id ?? novoId(), tipo: x.tipo, titulo: form.titulo.value.trim(), data: form.data.value, nota: form.nota.value.trim() };
      reg.fotoId = await trocarFoto(form, x.fotoId, { data: reg.data, origem: 'marco', ref: reg.id, legenda: reg.titulo });
      await db.salvar('marcos', reg);
      await carregar(); fecharFolha();
      estado.aba = 'marcos'; render();
      aviso(id ? 'Marco atualizado' : 'Marco registrado');
    };
    $('#apagar', f)?.addEventListener('click', async () => {
      if (!confirm('Apagar este marco?')) return;
      if (x.fotoId) await db.apagar('fotos', x.fotoId);
      await db.apagar('marcos', id);
      await carregar(); fecharFolha(); render();
    });
  });
}

function cardapioMais() {
  abrirFolha(`
    <h2>Registrar</h2>
    <div class="cardapio">
      <button data-acao="novo-peso"><img src="img/ui/peso.png" alt=""><span><b>Pesagem</b><small>Peso, altura e foto do dia</small></span></button>
      <button data-acao="nova-foto"><img src="img/ui/momentos.png" alt=""><span><b>Momento</b><small>Uma foto de algo novo</small></span></button>
      <button data-acao="novo-marco"><img src="img/ui/marcos.png" alt=""><span><b>Marco</b><small>Dente, palavra, primeiros passos…</small></span></button>
    </div>`);
}

function ajustes() {
  abrirFolha(`
    <h2>Ajustes</h2>
    <div class="cardapio">
      <button data-acao="perfil"><img src="img/ui/ajustes.png" alt=""><span><b>Dados do bebê</b><small>Nome, nascimento, foto</small></span></button>
      <button data-acao="exportar"><img src="img/ui/foto.png" alt=""><span><b>Fazer cópia de segurança</b><small>Salva tudo (com fotos) num arquivo</small></span></button>
      <button data-acao="importar"><img src="img/ui/inicio.png" alt=""><span><b>Restaurar cópia</b><small>Traz de volta um arquivo salvo</small></span></button>
    </div>
    <p class="nota" style="margin-top:16px">Tudo fica guardado só neste celular. Faça uma cópia de segurança de vez em quando e guarde no iCloud Drive ou mande para você mesmo.</p>
    <input type="file" id="arquivo-copia" accept=".json,application/json" hidden>`);
}

// ---------- cópia de segurança ----------
const blobParaTexto = (b) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); });
const textoParaBlob = async (t) => (await fetch(t)).blob();

async function exportar() {
  aviso('Preparando cópia…');
  const fotos = await Promise.all(estado.fotos.map(async (f) => ({ ...f, grande: await blobParaTexto(f.grande), mini: await blobParaTexto(f.mini) })));
  const conteudo = JSON.stringify({ app: 'ninho', versao: 1, perfil: estado.perfil, pesos: estado.pesos, marcos: estado.marcos, fotos });
  const nome = `ninho-${estado.perfil.nome.toLowerCase().replace(/\W+/g, '-')}-${hoje()}.json`;
  const arquivo = new File([conteudo], nome, { type: 'application/json' });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try { await navigator.share({ files: [arquivo], title: 'Cópia do Ninho' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(arquivo); a.download = nome; a.click();
}

async function importar(arquivo) {
  try {
    const d = JSON.parse(await arquivo.text());
    if (d.app !== 'ninho') throw new Error();
    if (!confirm('Restaurar esta cópia? O que está no app agora será substituído.')) return;
    for (const loja of ['pesos', 'fotos', 'marcos']) await db.limpar(loja);
    await db.salvar('kv', d.perfil, 'perfil');
    for (const p of d.pesos) await db.salvar('pesos', p);
    for (const m of d.marcos) await db.salvar('marcos', m);
    for (const f of d.fotos) await db.salvar('fotos', { ...f, grande: await textoParaBlob(f.grande), mini: await textoParaBlob(f.mini) });
    urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear();
    await carregar(); fecharFolha(); estado.aba = 'inicio'; render();
    aviso('Cópia restaurada');
  } catch { aviso('Arquivo inválido'); }
}

// ---------- visor de foto ----------
function abrirVisor(id) {
  const f = estado.fotos.find((x) => x.id === id);
  if (!f) return;
  const v = $('#visor');
  v.innerHTML = `
    <div class="topo"><button data-v="fechar">Fechar</button><button data-v="apagar">Apagar</button></div>
    <div class="img"><img src="${url(id, 'grande')}" alt=""></div>
    <div class="info"><b>${esc(f.legenda || 'Momento')}</b><span>${dataLonga(f.data)} · ${idade(f.data)}</span></div>`;
  v.classList.add('aberto');
  v.onclick = async (e) => {
    const b = e.target.closest('[data-v]')?.dataset.v;
    if (b === 'fechar') v.classList.remove('aberto');
    if (b === 'apagar' && confirm('Apagar esta foto?')) {
      await db.apagar('fotos', id);
      // tira a referência de quem usava a foto
      for (const [loja, lista] of [['pesos', estado.pesos], ['marcos', estado.marcos]])
        for (const r of lista.filter((r) => r.fotoId === id)) await db.salvar(loja, { ...r, fotoId: null });
      if (estado.perfil.fotoId === id) await db.salvar('kv', { ...estado.perfil, fotoId: null }, 'perfil');
      v.classList.remove('aberto');
      await carregar(); render();
    }
  };
}

// ---------- cliques ----------
document.addEventListener('click', (e) => {
  const alvo = e.target.closest('[data-acao],[data-ir],[data-aba],[data-foto],[data-peso],[data-marco],[data-marco-novo],.alvo,#mais');
  if (!alvo) return;
  if (alvo.matches('a')) e.preventDefault();
  const d = alvo.dataset;
  if (alvo.id === 'mais') return cardapioMais();
  if (d.aba) return ir(d.aba);
  if (d.ir) return ir(d.ir);
  if (d.foto) return abrirVisor(d.foto);
  if (d.peso) return formPeso(d.peso);
  if (alvo.classList.contains('alvo') && d.id) return formPeso(d.id);
  if (d.marco) return formMarco({ id: d.marco });
  if (d.marcoNovo) return formMarco({ tipo: d.marcoNovo });
  const acoes = {
    perfil: formPerfil, ajustes, exportar,
    'novo-peso': () => formPeso(), 'nova-foto': formFoto, 'novo-marco': () => formMarco({ tipo: 'outro' }),
    importar: () => $('#arquivo-copia').click(),
  };
  acoes[d.acao]?.();
});
document.addEventListener('change', (e) => { if (e.target.id === 'arquivo-copia' && e.target.files[0]) importar(e.target.files[0]); });
$('#folha-fundo').addEventListener('click', fecharFolha);

// arrastar a folha para baixo fecha
let toqueY = null;
$('#folha').addEventListener('touchstart', (e) => { if ($('#folha').scrollTop <= 0) toqueY = e.touches[0].clientY; }, { passive: true });
$('#folha').addEventListener('touchend', (e) => { if (toqueY !== null && e.changedTouches[0].clientY - toqueY > 90) fecharFolha(); toqueY = null; });

// ---------- início ----------
navigator.storage?.persist?.();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js');
await carregar();
render();
