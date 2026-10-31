// Guarda o app no aparelho para abrir sem internet. Ao mudar qualquer arquivo, suba a VERSAO.
const VERSAO = 'ninho-v1';
const ARQUIVOS = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css', 'css/fontes.css',
  'js/app.js', 'js/db.js', 'js/grafico.js', 'js/marcos.js',
  'fontes/fraunces.woff2', 'fontes/fraunces-italic.woff2', 'fontes/manrope.woff2',
  'img/icone-180.png', 'img/icone-192.png', 'img/icone-512.png',
  ...['inicio', 'peso', 'mais', 'momentos', 'marcos', 'ajustes', 'foto'].map((n) => `img/ui/${n}.png`),
  ...['boas-vindas', 'heroi', 'avatar', 'vazio-peso', 'vazio-momentos', 'vazio-marcos'].map((n) => `img/ilustra/${n}.png`),
  ...['sorriso', 'cabeca', 'gargalhada', 'rolou', 'papinha', 'sentou', 'dente', 'engatinhou', 'palminhas', 'empe', 'palavra', 'passos', 'noite', 'banho', 'cabelo', 'outro'].map((n) => `img/marcos/${n}.png`),
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r ?? fetch(e.request)));
});
