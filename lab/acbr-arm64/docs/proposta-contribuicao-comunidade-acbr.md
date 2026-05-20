# Proposta de contribuição para a comunidade ACBr

## Objetivo

Informar à comunidade ACBr que a ACBrLibNFe foi compilada e validada com sucesso em Linux ARM64/aarch64, no Oracle Cloud Ampere com Ubuntu 22.04 arm64.

## Canais sugeridos

1. Fórum ACBr, área ACBrLib.
2. Fórum ACBr, área ACBrNFe.
3. Fórum ACBr, área Dúvidas Gerais sobre o ACBr, caso os moderadores prefiram mover o tópico.
4. Discord ACBr, para chamar atenção para o tópico técnico no fórum.

## Título sugerido

```text
ACBrLibNFe compilada e validada em Linux ARM64/aarch64 - Oracle Cloud Ampere Ubuntu 22.04
```

## Corpo sugerido do tópico

```text
Olá pessoal,

Gostaria de compartilhar um laboratório técnico que fizemos com a ACBrLibNFe em Linux ARM64/aarch64.

Ambiente testado:

- Oracle Cloud Ampere ARM64
- Ubuntu 22.04 arm64
- Arquitetura: aarch64
- Lazarus/FPC via pacotes do Ubuntu
- OpenSSL 3.0.2
- LibXml2
- ACBrLibNFe compilada a partir dos fontes do ACBr

Resumo do resultado:

Conseguimos criar um build mode experimental Linux-aarch64-MT para o projeto ACBrLibNFeConsoleMT.lpi e gerar a biblioteca:

libacbrnfe_arm64.so

O binário gerado foi validado como:

ELF 64-bit LSB shared object, ARM aarch64

Funções testadas com sucesso:

- NFE_Inicializar
- NFE_Finalizar
- NFE_Nome
- NFE_Versao
- NFE_OpenSSLInfo
- NFE_ConfigGravarValor
- NFE_ConfigLerValor
- NFE_GerarChave
- NFE_CarregarINI
- NFE_ObterXml
- NFE_GravarXml
- NFE_ValidarRegrasdeNegocios
- NFE_Assinar
- NFE_VerificarAssinatura
- NFE_LimparLista

Ponto mais importante:

A ACBrLibNFe ARM64 conseguiu carregar uma NF-e por INI, gerar XML, carregar certificado A1/PFX autoassinado de teste, assinar o XML e verificar a assinatura com sucesso.

Resultado observado:

NFE_Assinar: ret=0
NFE_VerificarAssinatura: ret=0
NFE_ObterXml assinado: ret=0
contem_signature=True

Configuração usada na sessão [DFe]:

SSLCryptLib=1
SSLHttpLib=3
SSLXmlSignLib=4

Observações importantes:

- O teste de assinatura foi feito com certificado autoassinado apenas para validar assinatura local. Não é certificado ICP-Brasil e não serve para autorização na SEFAZ.
- PFX com senha apresentou problemas de MAC/PKCS#12 no OpenSSL 3 nesse ambiente. PFX sem senha funcionou no teste local.
- Ainda não testamos envio para SEFAZ, StatusServico, autorização, cancelamento, inutilização nem DANFE em PDF.

Repositório com o lab reproduzível:

https://github.com/fellypesyllva007/NfeWeb/tree/main/lab/acbr-arm64

Documento com status da validação:

https://github.com/fellypesyllva007/NfeWeb/blob/main/lab/acbr-arm64/docs/status-validacao-arm64.md

Minha intenção é contribuir com a comunidade e, se fizer sentido para o projeto, ajudar a transformar esse lab em uma sugestão de build mode oficial ou documentação para Linux ARM64/aarch64.

Perguntas para a equipe/comunidade:

1. Existe interesse em incluir um build mode Linux-aarch64-MT na ACBrLibNFe?
2. Qual seria o melhor caminho para enviar patch ou diff do .lpi?
3. Há alguma recomendação específica para lidar com PKCS#12/OpenSSL 3 no Linux ARM64?
4. Qual canal oficial preferem para seguir com a contribuição: fórum, SVN patch, issue, pull request no espelho GitHub ou outro caminho?

Obrigado!
```

## Evidências técnicas para anexar

### Binário ARM64

```text
libacbrnfe_arm64.so: ELF 64-bit LSB shared object, ARM aarch64
```

### Símbolos exportados

```text
NFE_Inicializar
NFE_Finalizar
NFE_Nome
NFE_Versao
```

### Versão ACBrLibNFe observada

```text
NFE_Nome: ACBrLibNFE
NFE_Versao: 1.5.0.455
```

### OpenSSL observado

```text
OpenSSL 3.0.2 15 Mar 2022
```

### Assinatura local

```text
NFE_Assinar: ret=0
NFE_VerificarAssinatura: ret=0
NFE_ObterXml assinado: ret=0
contem_signature=True
```

## Próximas contribuições possíveis

1. Publicar tópico no fórum ACBr.
2. Coletar feedback da equipe ACBr.
3. Ajustar scripts conforme orientação da comunidade.
4. Gerar patch mínimo para adicionar build mode Linux-aarch64-MT.
5. Testar StatusServico com certificado A1 real em homologação.
6. Testar envio/autorização em homologação.
7. Documentar limitações do OpenSSL 3 com PFX protegido por senha.
