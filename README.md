# Ninho — diário do bebê

App para iPhone (e Android) que acompanha o crescimento do bebê:

- **Peso**: anota peso, altura, data, observação e foto do dia. Gráfico com a curva do bebê sobre a faixa de referência da OMS (P3–P97, menino ou menina).
- **Momentos**: álbum de fotos por mês, com legenda. As fotos das pesagens e dos marcos também entram.
- **Marcos**: primeiro sorriso, primeiro dente, primeira palavra, primeiros passos e outros 12, mais "outro marco" livre. Linha do tempo com data, idade e foto.
- **Cópia de segurança**: Ajustes → salva tudo (com fotos) num arquivo para guardar no iCloud Drive, e restaura depois.

Tudo fica guardado só no celular; nada vai para a internet.

## Como instalar no iPhone

O app precisa estar num endereço `https://` (veja "Publicar"). Depois:

1. Abra o endereço no **Safari** do iPhone.
2. Toque em **Compartilhar** (quadrado com a seta) → **Adicionar à Tela de Início** → **Adicionar**.
3. Abra pelo ícone do Ninho. Ele abre em tela cheia, sem barra do navegador, e funciona sem internet.

Os dados ficam no app da tela inicial. Se apagar o ícone, os dados vão junto: faça a cópia de segurança antes.

## Publicar

É um site estático: basta enviar esta pasta (sem `node_modules`, `arte-fonte` e `tools`) para qualquer hospedagem com https, por exemplo GitHub Pages, Netlify ou Cloudflare Pages.

Ao mudar qualquer arquivo, suba a `VERSAO` em `sw.js` para os celulares baixarem a versão nova.

## Testar no notebook

```bash
node tools/servir.mjs 5186
```

## Imagens

Ícones e desenhos feitos no ChatGPT (chatgpt.com), em folhas de grade com fundo creme:

- `arte-fonte/` guarda as folhas originais.
- `tools/juntar.mjs` junta os pedaços capturados da tela, `tools/fatiar.mjs` recorta a grade em PNGs transparentes (`img/marcos`, `img/ui`) e `tools/compor.mjs` monta o ícone do app e as ilustrações (`img/ilustra`).
