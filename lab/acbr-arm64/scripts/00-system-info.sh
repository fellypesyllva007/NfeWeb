#!/usr/bin/env bash
set -euo pipefail

echo "== Sistema =="
uname -a

echo

echo "== Arquitetura =="
echo "uname -m: $(uname -m)"
echo "dpkg architecture: $(dpkg --print-architecture 2>/dev/null || true)"

echo

echo "== Ubuntu =="
lsb_release -a 2>/dev/null || cat /etc/os-release

echo

echo "== FPC =="
if command -v fpc >/dev/null 2>&1; then
  fpc -iV || true
  echo "Target processor: $(fpc -iTP || true)"
  echo "Target OS: $(fpc -iTO || true)"
else
  echo "fpc nao instalado"
fi

echo

echo "== Lazarus/lazbuild =="
if command -v lazbuild >/dev/null 2>&1; then
  lazbuild --version || true
else
  echo "lazbuild nao instalado"
fi

echo

echo "== Bibliotecas nativas =="
ldconfig -p | grep -E 'libxml2|libssl|libcrypto|zlib' || true
