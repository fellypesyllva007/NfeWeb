#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../../.."

export ACBR_HOME="${ACBR_HOME:-$HOME/acbr-arm64-lab/ACBr}"
export NFE_PFX_PASSWORD="${NFE_PFX_PASSWORD:-123456}"
export NFE_PFX_PATH="${NFE_PFX_PATH:-$HOME/certificados/nfe-teste-autoassinado-openssl3.pfx}"

OPENSSL_MODULES_DIR="${OPENSSL_MODULES_DIR:-/usr/lib/aarch64-linux-gnu/ossl-modules}"
OPENSSL_CONF_PATH="${OPENSSL_CONF_PATH:-/tmp/acbr-arm64-openssl.cnf}"

cat > "$OPENSSL_CONF_PATH" <<'EOF'
openssl_conf = openssl_init

[openssl_init]
providers = provider_sect
alg_section = algorithm_sect

[provider_sect]
default = default_sect
legacy = legacy_sect

[default_sect]
activate = 1

[legacy_sect]
activate = 1

[algorithm_sect]
default_properties =
EOF

export OPENSSL_CONF="$OPENSSL_CONF_PATH"
export OPENSSL_MODULES="$OPENSSL_MODULES_DIR"

cat <<EOF
== Ambiente OpenSSL para ACBrLibNFe ==
ACBR_HOME=$ACBR_HOME
NFE_PFX_PATH=$NFE_PFX_PATH
OPENSSL_CONF=$OPENSSL_CONF
OPENSSL_MODULES=$OPENSSL_MODULES

== Validando PFX com openssl CLI ==
EOF

openssl version -a

openssl pkcs12 \
  -in "$NFE_PFX_PATH" \
  -nokeys \
  -info \
  -password "pass:$NFE_PFX_PASSWORD" \
  >/tmp/acbr-arm64-pfx-check.out 2>/tmp/acbr-arm64-pfx-check.err || {
    echo "Falha ao ler PFX pelo openssl CLI"
    cat /tmp/acbr-arm64-pfx-check.err
    exit 1
  }

sed -n '1,30p' /tmp/acbr-arm64-pfx-check.err || true
sed -n '1,20p' /tmp/acbr-arm64-pfx-check.out || true

cat <<EOF

== Rodando assinatura ACBrLibNFe ==
EOF

python3 lab/acbr-arm64/scripts/10-assinar-com-certificado-a1.py
