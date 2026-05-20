# Endpoints fiscais da NfeWeb API

Data: 2026-05-20
Serviço: `nfeweb-api`
Versão registrada: `0.9.0`

## Objetivo

Este documento registra o contrato HTTP atual da API fiscal, já usando o SQLite como fonte única de configuração de emitentes, certificados, ambiente e numeração.

A rota antiga baseada em `clientes.json` foi removida como fonte operacional.

## Base pública

```text
http://webnfe.ddns.net/api
```

Internamente, a API roda em:

```text
127.0.0.1:3333
```

O Nginx faz o proxy reverso público para o serviço local.

## Endpoints de diagnóstico

### GET /api/health

Verifica se a API está ativa.

Resultado validado:

```json
{
  "status": "ok",
  "service": "nfeweb-api",
  "version": "0.9.0",
  "arch": "aarch64",
  "python": "3.10.12"
}
```

### GET /api/acbr/info

Carrega a ACBrLibNFe e retorna informações básicas da biblioteca.

Resultado validado anteriormente:

```text
nome: ACBrLibNFE
versao: 1.5.0.455
openssl: OpenSSL 3.0.2 15 Mar 2022
```

### GET /api/emitentes

Lista os emitentes fiscais ativos cadastrados no SQLite.

Resultado validado:

```text
id: emit_lab_acbr_sample
tenant_id: tenant_lab
cnpj: 92390477000149
uf: SP
ambiente: 1
modelo: 55
serie: 1
proximo_numero: 1
certificado_ativo: 1
```

### GET /api/db/status

Retorna status do banco SQLite e contadores das tabelas principais.

Resultado validado:

```text
db_path: /var/lib/nfeweb/nfeweb.sqlite3
exists: true
tenants: 1
fiscal_emitters: 1
fiscal_certificates: 1
fiscal_configs: 1
fiscal_sequences: 1
```

### GET /api/db/emitentes

Lista emitentes com visão mais próxima do banco.

## Rotas removidas

### GET /api/clientes

A rota antiga foi removida do fluxo operacional.

Resultado esperado:

```text
HTTP/1.1 410 Gone
```

Mensagem registrada:

```text
A rota /clientes foi removida. Use /api/emitentes; a fonte única agora é o SQLite.
```

## Payload padrão dos endpoints fiscais

Os endpoints fiscais exigem `emitter_id`.

```json
{
  "emitter_id": "emit_lab_acbr_sample"
}
```

Para evitar retornar XML completo em testes de API:

```json
{
  "emitter_id": "emit_lab_acbr_sample",
  "include_xml": false
}
```

Sem `emitter_id`, a API deve recusar a operação.

Resultado validado:

```json
{
  "status": "error",
  "service": "nfeweb-api",
  "operacao": "nfe.assinar",
  "error": "NFeOfflineError",
  "message": "emitter_id é obrigatório"
}
```

## Endpoints NF-e

### POST /api/nfe/gerar-chave

Gera chave NF-e usando ACBrLib.

Resultado validado:

```text
ret: 0
chave: 35260512345678000195550010000001231123456780
tamanho: 44
```

Observação: endpoint utilitário de laboratório; ainda não grava documento fiscal.

### POST /api/nfe/carregar-ini

Carrega o INI de exemplo, obtém XML e limpa a lista da ACBrLib.

Payload validado:

```json
{
  "emitter_id": "emit_lab_acbr_sample",
  "include_xml": false
}
```

Resultado validado:

```text
status: ok
operacao: nfe.carregar_ini
emitente.emitter_id: emit_lab_acbr_sample
carregar_ini.ret: 0
obter_xml.ret: 0
obter_xml.tamanho: 5932
limpar_lista.ret: 0
```

### POST /api/nfe/assinar

Carrega o INI de exemplo, configura o certificado A1 do emitente, assina o XML, verifica assinatura, obtém XML assinado e limpa a lista.

Payload validado:

```json
{
  "emitter_id": "emit_lab_acbr_sample",
  "include_xml": false
}
```

Resultado validado:

```text
status: ok
operacao: nfe.assinar
certificado.senha_len: 4
carregar_ini.ret: 0
assinar.ret: 0
verificar_assinatura.ret: 0
obter_xml.ret: 0
obter_xml.tamanho: 8471
obter_xml.contem_signature: true
limpar_lista.ret: 0
```

### POST /api/nfe/validar-regras

Carrega o INI de exemplo, executa validação de regras de negócio e limpa a lista.

Payload validado:

```json
{
  "emitter_id": "emit_lab_acbr_sample"
}
```

Resultado validado:

```text
status: ok
operacao: nfe.validar_regras
carregar_ini.ret: 0
validar_regras.ret: 0
limpar_lista.ret: 0
```

O XML de exemplo retorna rejeições esperadas, incluindo:

```text
228 - Data de Emissão muito atrasada
505 - Data de Entrada/Saída anterior ao permitido
533 - Total da BC ICMS-ST difere do somatório dos itens
534 - Total do ICMS-ST difere do somatório dos itens
862 - Total do FCP ST difere do somatório dos itens
610 - Total da NF difere do somatório dos valores
866 - Ausência de troco quando pagamentos informados excedem o total da nota
```

### POST /api/nfe/status-servico

Chama o webservice oficial de Status do Serviço da SEFAZ, usando o emitente do SQLite e forçando homologação no padrão da ACBrLib.

Payload validado:

```json
{
  "emitter_id": "emit_lab_acbr_sample"
}
```

Ambiente usado pela API:

```text
ACBrLib Ambiente=1 -> homologação
SEFAZ tpAmb equivalente=2
```

Resultado validado com certificado autoassinado:

```text
status: ok
operacao: nfe.status_servico
status_servico.ret: -10
Erro HTTP: 403
URL: https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx
```

Conclusão do teste:

```text
A API chegou no webservice oficial da SEFAZ SP em homologação.
A rejeição atual é de permissão/certificado, compatível com uso de certificado autoassinado.
```

## Fonte única de configuração fiscal

Os endpoints fiscais não usam mais:

```text
clientes.json
cliente_id
.env como cadastro operacional de cliente
```

A fonte única é:

```text
/var/lib/nfeweb/nfeweb.sqlite3
```

Principais tabelas lidas no fluxo fiscal atual:

```text
tenants
fiscal_emitters
fiscal_certificates
fiscal_configs
fiscal_sequences
```

## Próximos endpoints previstos

Ainda não implementados:

```text
POST /api/nfe/autorizar
POST /api/nfe/consultar-recibo
POST /api/nfe/consultar-protocolo
POST /api/nfe/cancelar
POST /api/nfe/inutilizar
GET  /api/nfe/documentos
GET  /api/nfe/documentos/{id}
```

Antes da autorização real, será necessário certificado A1 ICP-Brasil válido e CNPJ habilitado/credenciado para homologação.