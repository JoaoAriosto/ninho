// Banco local do aparelho (IndexedDB): perfil, pesagens, fotos e marcos.
const NOME = 'ninho', VERSAO = 1;
const LOJAS = ['kv', 'pesos', 'fotos', 'marcos'];

let conexao;
function abrir() {
  if (conexao) return conexao;
  conexao = new Promise((ok, erro) => {
    const req = indexedDB.open(NOME, VERSAO);
    req.onupgradeneeded = () => {
      for (const loja of LOJAS)
        if (!req.result.objectStoreNames.contains(loja))
          req.result.createObjectStore(loja, loja === 'kv' ? undefined : { keyPath: 'id' });
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
  return conexao;
}

async function tx(loja, modo, fn) {
  const banco = await abrir();
  return new Promise((ok, erro) => {
    const t = banco.transaction(loja, modo);
    const r = fn(t.objectStore(loja));
    t.oncomplete = () => ok(r?.result);
    t.onerror = () => erro(t.error);
  });
}

export const db = {
  todos: (loja) => tx(loja, 'readonly', (s) => s.getAll()),
  pegar: (loja, id) => tx(loja, 'readonly', (s) => s.get(id)),
  salvar: (loja, obj, chave) => tx(loja, 'readwrite', (s) => (chave ? s.put(obj, chave) : s.put(obj))),
  apagar: (loja, id) => tx(loja, 'readwrite', (s) => s.delete(id)),
  limpar: (loja) => tx(loja, 'readwrite', (s) => s.clear()),
};

export const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
