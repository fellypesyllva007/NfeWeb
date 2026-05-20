# Status da validação ACBrLibNFe em Linux ARM64

Data: 2026-05-20
Ambiente: Oracle Cloud Ampere ARM64, Ubuntu 22.04 arm64

## Resultado principal

A ACBrLibNFe foi compilada e executada com sucesso em Linux ARM64/aarch64.

Biblioteca gerada:

```text
/home/ubuntu/acbr-arm64-lab/ACBr/Projetos/ACBrLib/Fontes/NFe/bin/Linux/CONSOLE-MT/libacbrnfe_arm64.so
```

Validação do binário:

```text
ELF 64-bit LSB shared object, ARM aarch64
```

Símbolos principais exportados:

```text
NFE_Inicializar
NFE_Finalizar
NFE_Nome
NFE_Versao
```

## Etapas validadas

### 1. Compilação ARM64

Status: aprovado.

A biblioteca `libacbrnfe_arm64.so` foi gerada nativamente em ARM64.

### 2. Carregamento externo via Python/ctypes

Status: aprovado.

Funções testadas:

```text
NFE_Inicializar
NFE_Nome
NFE_Versao
NFE_OpenSSLInfo
NFE_Finalizar
```

Resultado observado:

```text
NFE_Inicializar: ret=0
NFE_Nome: ACBrLibNFE
NFE_Versao: 1.5.0.455
NFE_OpenSSLInfo: OpenSSL 3.0.2 15 Mar 2022
NFE_Finalizar: ret=0
```

### 3. Configuração e geração de chave NF-e

Status: aprovado.

Funções testadas:

```text
NFE_ConfigGravarValor
NFE_ConfigLerValor
NFE_GerarChave
```

Resultado observado:

```text
NFE_GerarChave: ret=0
valor=35260512345678000195550010000001231123456780
```

### 4. Carregamento de NF-e por INI e geração de XML

Status: aprovado.

Arquivo de entrada:

```text
Testes/Recursos/Arquivos-Comparacao/NFeNFCe/INI/NFe-Simples-RT-CST00.INI
```

Funções testadas:

```text
NFE_CarregarINI
NFE_ObterXml
NFE_GravarXml
NFE_LimparLista
```

Resultado observado:

```text
NFE_CarregarINI: ret=0
1 NFe(s) Carregada(s)
NFE_ObterXml(index=0): ret=0
XML gerado com aproximadamente 5932 bytes
NFE_GravarXml(index=0): ret=0
```

### 5. Validação de regras de negócio

Status: aprovado com rejeições esperadas do XML de exemplo.

Função testada:

```text
NFE_ValidarRegrasdeNegocios
```

Resultado observado:

```text
NFE_ValidarRegrasdeNegocios: ret=0
```

Rejeições retornadas pelo INI de exemplo incluem:

```text
228 - Data de Emissão muito atrasada
505 - Data de Entrada/Saída anterior ao permitido
533 - Total da BC ICMS-ST difere do somatório dos itens
534 - Total do ICMS-ST difere do somatório dos itens
862 - Total do FCP ST difere do somatório dos itens
610 - Total da NF difere do somatório dos valores
866 - Ausência de troco
```

Observação:

```text
NFE_Validar retornou -10 com TDFeSSLXmlSignClass para a combinação testada.
```

Isso não bloqueou a validação de regras de negócio.

### 6. Assinatura XML com certificado A1/PFX autoassinado

Status: aprovado.

Foi necessário usar:

```text
SSLCryptLib=1
SSLHttpLib=3
SSLXmlSignLib=4
```

Ou seja:

```text
SSLCryptLib = OpenSSL
SSLHttpLib = OpenSSL
SSLXmlSignLib = LibXml2
```

Também foi necessário usar um PFX sem senha para o certificado de teste autoassinado.

Certificado de teste compatível com o CNPJ do INI de exemplo:

```text
/home/ubuntu/certificados/nfe-teste-acbr-sample.pfx
```

CNPJ usado no certificado de teste:

```text
92390477000141
```

Resultado observado:

```text
NFE_Assinar: ret=0
NFE_VerificarAssinatura: ret=0
NFE_ObterXml assinado: ret=0
contem_signature=True
XML assinado salvo: /tmp/acbrlib-nfe-arm64-.../nfe-assinada.xml
NFE_Finalizar: ret=0
```

## Conclusão técnica

A ACBrLibNFe funciona em Linux ARM64 no Oracle Cloud Ampere para as etapas locais essenciais:

```text
compilação
carregamento da .so
inicialização
configuração
geração de chave NF-e
carga de NF-e por INI
geração de XML
validação de regras de negócio
assinatura XML com certificado A1/PFX
verificação de assinatura
```

## Limitações ainda não validadas

Ainda faltam testes de:

```text
certificado A1 ICP-Brasil real
consulta StatusServico na SEFAZ homologação
envio/autorização em homologação
retorno de autorização
cancelamento em homologação
inutilização em homologação
geração de DANFE em PDF em ambiente headless
integração com backend web do NfeWeb
```

## Próximo marco recomendado

Criar um `fiscal-service` local para encapsular a ACBrLibNFe ARM64 e expor uma API interna para o sistema web.

Fluxo recomendado:

```text
NfeWeb API
  -> FiscalGateway
  -> fiscal-service
  -> libacbrnfe_arm64.so
  -> SEFAZ homologação/produção
```
