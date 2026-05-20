#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-$HOME/acbr-arm64-lab}"
ACBR_DIR="$ROOT_DIR/ACBr"

mkdir -p "$ROOT_DIR"

if [[ -d "$ACBR_DIR/.git" ]]; then
  echo "ACBr ja existe em: $ACBR_DIR"
  git -C "$ACBR_DIR" pull --ff-only
else
  echo "Clonando espelho publico do ACBr..."
  git clone https://github.com/MirrorProjetoACBr/ACBr.git "$ACBR_DIR"
fi

cat <<EOF

ACBr em: $ACBR_DIR

Para usar nos proximos scripts:
export ACBR_HOME="$ACBR_DIR"
EOF
