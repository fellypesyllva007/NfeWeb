#!/usr/bin/env bash
set -euo pipefail

# Certificado autoassinado compatível com o INI de exemplo do ACBr:
# Testes/Recursos/Arquivos-Comparacao/NFeNFCe/INI/NFe-Simples-RT-CST00.INI
#
# A chave de acesso gerada no XML de exemplo começa com:
# NFe35240892390477000141...
# Logo, o CNPJ do emitente é 92390477000141.
#
# Este certificado NÃO é ICP-Brasil e NÃO será aceito pela SEFAZ.
# Serve apenas para testar assinatura XML local com ACBrLibNFe ARM64.

CERT_DIR="${CERT_DIR:-$HOME/certificados}"
CERT_NAME="${CERT_NAME:-nfe-teste-acbr-sample}"
CERT_PASSWORD="${CERT_PASSWORD-}"
DAYS="${DAYS:-365}"
CNPJ_TESTE="${CNPJ_TESTE:-92390477000141}"

mkdir -p "$CERT_DIR"
chmod 700 "$CERT_DIR"

KEY_PATH="$CERT_DIR/$CERT_NAME.key.pem"
CRT_PATH="$CERT_DIR/$CERT_NAME.crt.pem"
PFX_PATH="$CERT_DIR/$CERT_NAME.pfx"
INFO_PATH="$CERT_DIR/$CERT_NAME-info.txt"

SUBJECT="/C=BR/ST=SP/L=Sao Paulo/O=NF-e Teste Local/OU=Laboratorio ACBr ARM64/CN=NF-e Teste Local:$CNPJ_TESTE"

cat <<EOF
Gerando certificado A1/PFX autoassinado compatível com INI de exemplo ACBr...

Diretorio: $CERT_DIR
Nome:      $CERT_NAME
Senha len: ${#CERT_PASSWORD}
CNPJ:      $CNPJ_TESTE
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
  -certpbe AES-256-CBC \
  -keypbe AES-256-CBC \
  -macalg sha256 \
  -password "pass:$CERT_PASSWORD"

chmod 600 "$KEY_PATH" "$CRT_PATH" "$PFX_PATH"

{
  echo "PFX_PATH=$PFX_PATH"
  echo "PFX_PASSWORD_LEN=${#CERT_PASSWORD}"
  echo "CNPJ_TESTE=$CNPJ_TESTE"
  echo "CERT_PATH=$CRT_PATH"
  echo "KEY_PATH=$KEY_PATH"
  echo
  openssl x509 -in "$CRT_PATH" -noout -subject -issuer -dates -serial -fingerprint -sha256
  echo
  echo "PKCS12 info:"
  openssl pkcs12 -in "$PFX_PATH" -nokeys -info -password "pass:$CERT_PASSWORD" 2>&1 | sed -n '1,80p'
} > "$INFO_PATH"

cat <<EOF

Certificado gerado com sucesso:

PFX:          $PFX_PATH
Senha length: ${#CERT_PASSWORD}
Info:         $INFO_PATH

Para testar assinatura:

cd ~/NfeWeb
export ACBR_HOME="\$HOME/acbr-arm64-lab/ACBr"
export NFE_PFX_PATH="$PFX_PATH"
export NFE_PFX_PASSWORD="$CERT_PASSWORD"

bash lab/acbr-arm64/scripts/12-testar-assinatura-com-openssl-providers.sh
EOF
