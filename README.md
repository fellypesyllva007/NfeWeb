# NfeWeb

Laboratório para integração de emissão de NF-e em ambiente Linux ARM64, com foco inicial em portar/validar ACBrLibNFe no Oracle Cloud Ampere ARM Ubuntu 22.04.

## Objetivo do lab

Validar se a ACBrLibNFe pode ser compilada e executada como biblioteca nativa Linux ARM64/aarch64.

Escopo inicial:

1. preparar ambiente ARM64;
2. instalar Lazarus/FPC e dependências nativas;
3. obter o código-fonte do ACBr;
4. adicionar build mode `Linux-aarch64-MT` ao projeto `ACBrLibNFeConsoleMT.lpi`;
5. compilar `libacbrnfe_arm64.so`;
6. validar carregamento da biblioteca;
7. evoluir para testes de XML, certificado A1, status SEFAZ e homologação.

## Estrutura

```text
lab/acbr-arm64/
├── README.md
├── scripts/
│   ├── 00-system-info.sh
│   ├── 01-install-deps-ubuntu-22-arm64.sh
│   ├── 02-clone-acbr.sh
│   ├── 03-add-linux-aarch64-buildmode.py
│   ├── 04-build-acbrlib-nfe-arm64.sh
│   └── 05-smoke-test-library.sh
└── docs/
    └── acbrlib-nfe-arm64-lab.md
```

## Ambiente alvo

- Oracle Cloud Ampere ARM
- Ubuntu 22.04 arm64
- CPU/arquitetura esperada: `aarch64`
- Debian architecture esperada: `arm64`

## Status

Lab inicial criado para validação técnica. Ainda não significa suporte produtivo homologado.
