#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Execute com sudo: sudo bash $0"
  exit 1
fi

ARCH="$(dpkg --print-architecture)"
if [[ "$ARCH" != "arm64" ]]; then
  echo "AVISO: arquitetura dpkg atual: $ARCH. O lab foi pensado para arm64."
fi

apt-get update

DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential \
  ca-certificates \
  curl \
  git \
  subversion \
  unzip \
  p7zip-full \
  pkg-config \
  fpc \
  fp-utils \
  lazarus \
  lcl-nogui \
  libxml2 \
  libxml2-dev \
  libssl-dev \
  openssl \
  zlib1g \
  zlib1g-dev

apt-get clean

echo "Dependencias instaladas. Valide com: bash lab/acbr-arm64/scripts/00-system-info.sh"
