#!/usr/bin/env bash
set -euo pipefail

CERT_DIR="${CERT_DIR:-$HOME/certificados}"
CERT_NAME="${CERT_NAME:-nfe-teste-autoassinado}"
CERT_PASSWORD="${CERT_PASSWORD:-123456}"
DAYS="${DAYS:-365}"
CNPJ_TESTE="${CNPJ_TESTE:-12345678000195}"

mkdir -p "$CERT_DIR"
chmod 700 "$CERT_DIR"

KEY_PATH="$CERT_DIR/$CERT_NAME.key.pem"
CRT_PATH="$CERT_DIR/$CERT_NAME.crt.pem"
PFX_PATH="$CERT_DIR/$CERT_NAME.pfx"
INFO_PATH="$CERT_DIR/$CERT_NAME-info.txt"

SUBJECT="/C=BR/ST=SP/L=Sao Paulo/O=NF-e Teste Local/OU=Laboratorio ACBr ARM64/CN=NF-e Teste Local:$CNPJ_TESTE"

cat <<EOF
Gerando certificado A1/PFX autoassinado para teste local...

Diretorio: $CERT_DIR
Nome:      $CERT_NAME
Senha:     $CERT_PASSWORD
CNPJ fake: $CNPJ_TESTE
Validade:  $DAYS dias

ATENCAO: este certificado NAO e ICP-Brasil e NAO sera aceito pela SEFAZ.
Ele serve apenas para testar assinatura XML local.
EOF

openssl req \
  -x509 \
  -newkey rsa:2048 \
  -sha256 \
  -days "$DAYS" \
  -nodes \
  -keyout "$KEY_PATH" \
  -out "$CRT_PATH" \
  -subj "$SUBJECT"

openssl pkcs12 \
  -export \
  -inkey "$KEY_PATH" \
  -in "$CRT_PATH" \
  -out "$PFX_PATH" \
  -name "$CERT_NAME" \
  -password "pass:$CERT_PASSWORD"

chmod 600 "$KEY_PATH" "$CRT_PATH" "$PFX_PATH"

{
  echo "PFX_PATH=$PFX_PATH"
  echo "PFX_PASSWORD=$CERT_PASSWORD"
  echo "CERT_PATH=$CRT_PATH"
  echo "KEY_PATH=$KEY_PATH"
  echo
  openssl x509 -in "$CRT_PATH" -noout -subject -issuer -dates -serial -fingerprint -sha256
  echo
  echo "PKCS12 info:"
  openssl pkcs12 -in "$PFX_PATH" -nokeys -info -password "pass:$CERT_PASSWORD" 2>&1 | sed -n '1,40p'
} > "$INFO_PATH"

cat <<EOF

Certificado gerado com sucesso:

PFX:  $PFX_PATH
Senha: $CERT_PASSWORD
Info: $INFO_PATH

Para testar assinatura:

export ACBR_HOME="\$HOME/acbr-arm64-lab/ACBr"
export NFE_PFX_PATH="$PFX_PATH"
export NFE_PFX_PASSWORD="$CERT_PASSWORD"

python3 lab/acbr-arm64/scripts/10-assinar-com-certificado-a1.py
EOF
