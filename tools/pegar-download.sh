#!/usr/bin/env bash
# Traz o PNG que acabou de ser baixado do ChatGPT (mais novo que o marco) para arte-fonte/<nome>.png.
# Só pega arquivos criados depois do marco, para nunca mexer em downloads antigos do dono.
# Uso: tools/pegar-download.sh <marco> <nome>
set -euo pipefail
marco="$1"; nome="$2"
for _ in $(seq 1 60); do
  novo=$(find /c/Users/jpker/Downloads -maxdepth 1 \( -name '*.png' -o -name '*.webp' -o -name '*.jpg' \) -newer "$marco" -print -quit)
  if [ -n "$novo" ]; then
    mv "$novo" "arte-fonte/$nome.png"
    touch "$marco"
    echo "arte-fonte/$nome.png"
    exit 0
  fi
  sleep 2
done
echo "nenhum download novo" >&2
exit 1
