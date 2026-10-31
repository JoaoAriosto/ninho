// Marcos de desenvolvimento sugeridos. "img" aponta para os ícones feitos no ChatGPT (img/marcos/).
// "mes" é a idade típica, só para ordenar as sugestões.
export const MARCOS = [
  { tipo: 'sorriso', titulo: 'Primeiro sorriso', mes: 1.5 },
  { tipo: 'cabeca', titulo: 'Sustentou a cabeça', mes: 3 },
  { tipo: 'gargalhada', titulo: 'Primeira gargalhada', mes: 4 },
  { tipo: 'rolou', titulo: 'Rolou sozinho', mes: 4.5 },
  { tipo: 'papinha', titulo: 'Primeira papinha', mes: 6 },
  { tipo: 'sentou', titulo: 'Sentou sozinho', mes: 6.5 },
  { tipo: 'dente', titulo: 'Nasceu o primeiro dente', mes: 7 },
  { tipo: 'engatinhou', titulo: 'Engatinhou', mes: 8 },
  { tipo: 'palminhas', titulo: 'Bateu palminhas', mes: 9 },
  { tipo: 'empe', titulo: 'Ficou em pé', mes: 10 },
  { tipo: 'palavra', titulo: 'Primeira palavra', mes: 11 },
  { tipo: 'passos', titulo: 'Primeiros passos', mes: 12 },
  { tipo: 'noite', titulo: 'Dormiu a noite toda', mes: 5 },
  { tipo: 'banho', titulo: 'Primeiro banho', mes: 0 },
  { tipo: 'cabelo', titulo: 'Primeiro corte de cabelo', mes: 14 },
  { tipo: 'outro', titulo: 'Momento especial', mes: 99 },
];

export const marcoPorTipo = (tipo) => MARCOS.find((m) => m.tipo === tipo) ?? MARCOS.at(-1);
export const imgMarco = (tipo) => `img/marcos/${marcoPorTipo(tipo).tipo}.png`;
