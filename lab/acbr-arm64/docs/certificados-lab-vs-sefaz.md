# Certificados de laboratório vs SEFAZ oficial

Data: 2026-05-20
Contexto: ACBrLibNFe ARM64, NF-e modelo 55, NfeWeb API

## Objetivo

Este documento registra o comportamento observado com certificados autoassinados no laboratório local e no webservice oficial da SEFAZ em homologação.

## Certificado autoassinado no laboratório

O certificado autoassinado foi suficiente para validar os fluxos locais da ACBrLibNFe:

```text
carregar INI
gerar XML
assinar XML
verificar assinatura
validar regras de negócio locais
```

Certificado de teste com senha validado:

```text
/home/ubuntu/certificados/nfe-teste-acbr-sample-1234.pfx
```

Senha de laboratório:

```text
1234
```

No banco SQLite, o certificado está registrado como:

```text
certificate_id: cert_lab_acbr_sample
emitter_id: emit_lab_acbr_sample
pfx_path: /home/ubuntu/certificados/nfe-teste-acbr-sample-1234.pfx
password_secret_ref: env:NFE_PFX_PASSWORD
is_active: 1
```

A senha não deve ser retornada ao frontend. A API retorna apenas:

```text
senha_configurada: true
senha_len: 4
```

## Resultado local validado

Endpoint:

```text
POST /api/nfe/assinar
```

Payload:

```json
{
  "emitter_id": "emit_lab_acbr_sample",
  "include_xml": false
}
```

Resultado observado:

```text
carregar_ini.ret: 0
assinar.ret: 0
verificar_assinatura.ret: 0
obter_xml.ret: 0
obter_xml.tamanho: 8471
obter_xml.contem_signature: true
limpar_lista.ret: 0
```

Conclusão:

```text
O certificado autoassinado é adequado para laboratório local de assinatura e validação criptográfica do XML.
```

## Certificado autoassinado contra SEFAZ homologação

Endpoint testado:

```text
POST /api/nfe/status-servico
```

Payload:

```json
{
  "emitter_id": "emit_lab_acbr_sample"
}
```

Ambiente forçado no endpoint:

```text
ACBrLib Ambiente=1 -> homologação
SEFAZ tpAmb equivalente=2
```

URL oficial resolvida pela ACBrLib:

```text
https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx
```

Retorno observado:

```text
status: ok
operacao: nfe.status_servico
status_servico.ret: -10
Erro Interno: 0
Erro HTTP: 403
403 - Forbidden: Access is denied.
You do not have permission to view this directory or page using the credentials that you supplied.
```

## Interpretação

A API chegou ao webservice oficial da SEFAZ SP em homologação. Isso valida:

```text
ACBrLib inicializando corretamente
OpenSSL/providers carregados
endpoint de homologação resolvido pela ACBrLib
conectividade externa até a SEFAZ
uso correto de Ambiente=1 para homologação na ACBrLib
```

A falha atual é de autorização/certificado:

```text
HTTP 403 Forbidden
```

Conclusão:

```text
O certificado autoassinado não foi aceito pelo webservice oficial da SEFAZ em homologação.
```

## Certificado necessário para SEFAZ oficial

Para avançar em comunicação real com SEFAZ, será necessário usar certificado ICP-Brasil válido, normalmente A1 ou A3, vinculado ao CNPJ emissor.

Requisitos práticos esperados:

```text
certificado ICP-Brasil válido
CNPJ compatível com o emitente
CNPJ habilitado/credenciado para NF-e na UF correspondente
ambiente homologação configurado corretamente
cadeia de certificado reconhecida pela infraestrutura da SEFAZ
```

## Regra para o projeto

Separar claramente dois tipos de certificado:

```text
Certificado de laboratório:
  - autoassinado
  - usado para testes locais
  - não deve ser usado para autorização real SEFAZ

Certificado operacional:
  - ICP-Brasil A1/A3
  - usado para StatusServico, autorização, consulta, cancelamento e inutilização
  - senha nunca enviada ao frontend
```

## Próximos passos

1. Obter certificado A1 ICP-Brasil real para um CNPJ de teste/homologação.
2. Cadastrar o emitente no SQLite.
3. Cadastrar o certificado em `fiscal_certificates`.
4. Validar `POST /api/nfe/status-servico` novamente.
5. Esperar retorno SEFAZ com `cStat` e `xMotivo`, em vez de HTTP 403.
6. Só depois avançar para autorização de NF-e em homologação.