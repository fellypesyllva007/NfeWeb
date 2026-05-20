#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${ACBR_HOME:-}" ]]; then
  echo "ERRO: defina ACBR_HOME. Exemplo: export ACBR_HOME=\$HOME/acbr-arm64-lab/ACBr" >&2
  exit 1
fi

PROJECT="$ACBR_HOME/Projetos/ACBrLib/Fontes/NFe/ACBrLibNFeConsoleMT.lpi"
BUILD_MODE="Linux-aarch64-MT"

if [[ ! -f "$PROJECT" ]]; then
  echo "ERRO: projeto nao encontrado: $PROJECT" >&2
  exit 1
fi

if ! command -v lazbuild >/dev/null 2>&1; then
  echo "ERRO: lazbuild nao encontrado. Rode scripts/01-install-deps-ubuntu-22-arm64.sh" >&2
  exit 1
fi

echo "== Validando target FPC =="
fpc -iTP || true
fpc -iTO || true

echo

echo "== Aplicando build mode $BUILD_MODE =="
python3 "$(dirname "$0")/03-add-linux-aarch64-buildmode.py"

echo

echo "== Compilando ACBrLibNFe para Linux ARM64 =="
lazbuild --build-mode="$BUILD_MODE" "$PROJECT"

OUT1="$ACBR_HOME/Projetos/ACBrLib/Fontes/NFe/bin/Linux/CONSOLE-MT/libacbrnfe_arm64.so"
OUT2="$ACBR_HOME/Projetos/ACBrLib/Fontes/NFe/bin/Linux/CONSOLE-MT/libacbrnfe_arm64"

if [[ -f "$OUT1" ]]; then
  OUT="$OUT1"
elif [[ -f "$OUT2" ]]; then
  OUT="$OUT2"
else
  echo "AVISO: nao encontrei saida esperada em:" >&2
  echo "  $OUT1" >&2
  echo "  $OUT2" >&2
  echo "Listando binarios encontrados:" >&2
  find "$ACBR_HOME/Projetos/ACBrLib/Fontes/NFe/bin" -maxdepth 4 -type f 2>/dev/null || true
  exit 2
fi

echo

echo "Biblioteca gerada: $OUT"
file "$OUT" || true
ldd "$OUT" || true
