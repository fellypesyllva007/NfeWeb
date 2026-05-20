# Lab ACBrLibNFe Linux ARM64

Este lab valida a compilacao da ACBrLibNFe em Oracle Cloud Ampere ARM, Ubuntu 22.04 arm64.

## Hipotese

A ACBrLib ja possui build para Linux x86_64/i386 e build Android arm64-v8a/aarch64. Este lab cria um alvo experimental `Linux-aarch64-MT`, combinando:

- `TargetCPU=aarch64`
- `TargetOS=linux`
- `LCLWidgetType=nogui`
- `ExecutableType=Library`

## Execucao no servidor

Clone este repositorio no Oracle Cloud ARM64:

```bash
git clone https://github.com/fellypesyllva007/NfeWeb.git
cd NfeWeb
```

Valide o sistema:

```bash
bash lab/acbr-arm64/scripts/00-system-info.sh
```

Instale dependencias:

```bash
sudo bash lab/acbr-arm64/scripts/01-install-deps-ubuntu-22-arm64.sh
```

Clone o ACBr:

```bash
bash lab/acbr-arm64/scripts/02-clone-acbr.sh
export ACBR_HOME="$HOME/acbr-arm64-lab/ACBr"
```

Compile:

```bash
bash lab/acbr-arm64/scripts/04-build-acbrlib-nfe-arm64.sh
```

Valide a biblioteca gerada:

```bash
bash lab/acbr-arm64/scripts/05-smoke-test-library.sh
```

## Resultado esperado

Uma biblioteca nativa ARM64, idealmente em:

```text
$ACBR_HOME/Projetos/ACBrLib/Fontes/NFe/bin/Linux/CONSOLE-MT/libacbrnfe_arm64.so
```

O comando `file` deve indicar algo similar a:

```text
ELF 64-bit LSB shared object, ARM aarch64
```

## Observacao importante

Este lab nao confirma emissao fiscal em producao. Ele apenas valida a primeira etapa: compilacao e carregamento da ACBrLibNFe em Linux ARM64.

Depois da compilacao, a validacao fiscal minima deve incluir:

1. inicializacao da lib;
2. leitura da versao;
3. configuracao do certificado A1;
4. geracao de XML;
5. assinatura;
6. validacao XSD;
7. consulta status SEFAZ;
8. emissao em homologacao;
9. cancelamento em homologacao;
10. geracao de DANFE.
