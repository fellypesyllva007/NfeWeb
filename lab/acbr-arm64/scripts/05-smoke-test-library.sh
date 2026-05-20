#!/usr/bin/env bash
set -euo pipefail

LIB_PATH="${1:-}"

if [[ -z "$LIB_PATH" ]]; then
  if [[ -z "${ACBR_HOME:-}" ]]; then
    echo "Uso: $0 /caminho/libacbrnfe_arm64.so" >&2
    echo "ou defina ACBR_HOME para tentar localizar automaticamente." >&2
    exit 1
  fi

  CANDIDATE1="$ACBR_HOME/Projetos/ACBrLib/Fontes/NFe/bin/Linux/CONSOLE-MT/libacbrnfe_arm64.so"
  CANDIDATE2="$ACBR_HOME/Projetos/ACBrLib/Fontes/NFe/bin/Linux/CONSOLE-MT/libacbrnfe_arm64"

  if [[ -f "$CANDIDATE1" ]]; then
    LIB_PATH="$CANDIDATE1"
  elif [[ -f "$CANDIDATE2" ]]; then
    LIB_PATH="$CANDIDATE2"
  else
    echo "ERRO: nao encontrei biblioteca automaticamente." >&2
    exit 1
  fi
fi

if [[ ! -f "$LIB_PATH" ]]; then
  echo "ERRO: arquivo nao encontrado: $LIB_PATH" >&2
  exit 1
fi

echo "== Arquivo =="
file "$LIB_PATH"

echo

echo "== Dependencias dinamicas =="
ldd "$LIB_PATH" || true

echo

echo "== Simbolos ACBrLibNFe esperados =="
if command -v nm >/dev/null 2>&1; then
  nm -D "$LIB_PATH" 2>/dev/null | grep -E 'NFE_Inicializar|NFE_Finalizar|NFE_Nome|NFE_Versao' || {
    echo "AVISO: simbolos principais nao encontrados com nm -D. A lib pode ter exportacao diferente ou build falhou parcialmente."
  }
else
  echo "nm nao instalado"
fi

echo

echo "Smoke test concluido. Proximo passo: criar wrapper minimo na linguagem do backend para chamar NFE_Inicializar/NFE_Versao."
