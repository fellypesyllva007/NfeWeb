# Plano de validacao ACBrLibNFe em Linux ARM64

## 1. Validacao do ambiente

Comandos:

```bash
uname -m
dpkg --print-architecture
fpc -iTP
fpc -iTO
lazbuild --version
```

Valores esperados:

```text
uname -m: aarch64
dpkg: arm64
fpc target processor: aarch64
fpc target OS: linux
```

## 2. Build mode experimental

O script `03-add-linux-aarch64-buildmode.py` altera:

```text
Projetos/ACBrLib/Fontes/NFe/ACBrLibNFeConsoleMT.lpi
```

Adicionando:

```text
Build mode: Linux-aarch64-MT
TargetCPU: aarch64
TargetOS: linux
CustomOptions: -dMT -dNOGUI -dNOREPORT
```

Ele tambem cria backup:

```text
ACBrLibNFeConsoleMT.lpi.bak
```

## 3. Compilacao

Comando principal:

```bash
export ACBR_HOME="$HOME/acbr-arm64-lab/ACBr"
bash lab/acbr-arm64/scripts/04-build-acbrlib-nfe-arm64.sh
```

## 4. Problemas provaveis

### 4.1 Pacotes Lazarus ausentes

Sintoma:

```text
Cannot find package LCL
Cannot find unit Interfaces
```

Acao:

```bash
sudo apt install lazarus lcl-nogui fpc fp-utils
```

### 4.2 LibXML2/OpenSSL ausentes

Sintoma:

```text
cannot find -lxml2
cannot find -lssl
cannot find -lcrypto
```

Acao:

```bash
sudo apt install libxml2-dev libssl-dev zlib1g-dev
```

### 4.3 Flags Android indevidas

Sintoma:

```text
aarch64-linux-android-* not found
```

Causa:

O build mode errado foi usado ou flags Android foram copiadas.

Acao:

Usar apenas:

```text
-dMT -dNOGUI -dNOREPORT
```

### 4.4 Saida sem extensao .so

Alguns builds podem gerar `libacbrnfe_arm64` sem extensao. O script aceita os dois caminhos e mostra `file`/`ldd`.

## 5. Criterio de sucesso da etapa 1

O lab passa a etapa 1 se:

```bash
file libacbrnfe_arm64.so
```

retornar biblioteca ELF ARM64 e:

```bash
ldd libacbrnfe_arm64.so
```

nao mostrar dependencias como `not found`.

## 6. Proxima etapa

Criar wrapper minimo para chamar:

```text
NFE_Inicializar
NFE_Versao
NFE_Finalizar
```

Depois, evoluir para:

```text
NFE_ConfigLerValor
NFE_ConfigGravarValor
NFE_ConfigurarDados
NFE_CriarNFe
NFE_Assinar
NFE_Validar
NFE_StatusServico
```
