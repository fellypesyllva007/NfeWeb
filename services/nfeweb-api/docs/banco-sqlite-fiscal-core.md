# Banco SQLite Fiscal Core

Data: 2026-05-20
Banco atual: `/var/lib/nfeweb/nfeweb.sqlite3`

## Objetivo

Este documento registra o papel do SQLite como fonte única inicial do núcleo fiscal da NfeWeb API.

O banco é a base para integração futura com ERPWeb, login, cadastro de emitentes, certificados, configuração fiscal, numeração e documentos fiscais.

## Estado atual validado

Arquivo:

```text
/var/lib/nfeweb/nfeweb.sqlite3
```

Tamanho observado:

```text
188416 bytes
```

Migration aplicada:

```text
version: 1
name: initial_fiscal_core_schema
applied_at: 2026-05-20 19:31:56
```

Contadores validados:

```text
tenants: 1
users: 0
tenant_users: 0
fiscal_emitters: 1
fiscal_certificates: 1
fiscal_configs: 1
fiscal_sequences: 1
erp_references: 0
fiscal_documents: 0
fiscal_document_artifacts: 0
fiscal_events: 0
fiscal_number_voids: 0
fiscal_logs: 0
```

## Tabelas

### tenants

Representa o cliente/empresa no contexto do ERPWeb.

No futuro, cada tenant poderá ter usuários, cadastros internos, produtos, clientes comerciais e emitentes fiscais.

Seed atual:

```text
id: tenant_lab
nome: Laboratório ACBr
slug: lab-acbr
status: active
```

### users

Tabela futura de usuários de login.

Ainda sem registros.

### tenant_users

Tabela futura de vínculo entre usuário e tenant.

Permite que um usuário acesse um ou mais tenants conforme permissões.

Ainda sem registros.

### fiscal_emitters

Representa o emitente fiscal, isto é, o CNPJ que emite NF-e.

Seed atual:

```text
id: emit_lab_acbr_sample
tenant_id: tenant_lab
cnpj: 92390477000149
razao_social: RAZAO SOCIAL - LAB ACBr
nome_fantasia: FANTASIA
uf: SP
ambiente: 1
status: active
```

Observação importante:

```text
No contexto ACBrLib, ambiente=1 significa homologação.
No XML/SEFAZ, o tpAmb equivalente de homologação é 2.
```

### fiscal_certificates

Armazena o certificado fiscal ativo do emitente.

Seed atual:

```text
id: cert_lab_acbr_sample
tenant_id: tenant_lab
emitter_id: emit_lab_acbr_sample
kind: A1
pfx_path: /home/ubuntu/certificados/nfe-teste-acbr-sample-1234.pfx
password_secret_ref: env:NFE_PFX_PASSWORD
is_active: 1
```

Regra de segurança atual:

```text
A senha não deve ser retornada pela API.
A API pode indicar apenas senha_configurada=true/false.
```

No laboratório, a senha é resolvida por:

```text
password_secret_ref = env:NFE_PFX_PASSWORD
```

Valor usado no laboratório:

```text
NFE_PFX_PASSWORD=1234
```

No futuro, esse mecanismo deve evoluir para cofre de segredo, KMS, secret manager ou armazenamento criptografado.

### fiscal_configs

Armazena configuração fiscal ativa do emitente.

Seed atual:

```text
id: cfg_lab_nfe_55_1
tenant_id: tenant_lab
emitter_id: emit_lab_acbr_sample
modelo: 55
serie: 1
ambiente: 1
uf: SP
path_schemas: /home/ubuntu/acbr-arm64-lab/ACBr/Exemplos/ACBrDFe/Schemas/NFe
path_salvar: /var/lib/nfeweb/notas
is_active: 1
```

### fiscal_sequences

Controla numeração fiscal por emitente, modelo, série e ambiente.

Seed atual:

```text
id: seq_lab_nfe_55_1
tenant_id: tenant_lab
emitter_id: emit_lab_acbr_sample
modelo: 55
serie: 1
ambiente: 1
proximo_numero: 1
ultimo_numero_emitido: null
```

Regra futura:

```text
A numeração deve ser controlada de forma transacional.
Não pode haver duplicidade por CNPJ/modelo/série/ambiente.
```

### erp_references

Tabela prevista para vincular documentos fiscais a entidades do ERPWeb.

Exemplos futuros:

```text
pedido
venda
cliente
produto
movimento de estoque
conta a receber
```

Ainda sem registros.

### fiscal_documents

Tabela prevista para registrar a NF-e como documento fiscal.

Deverá armazenar, no mínimo:

```text
tenant_id
emitter_id
modelo
serie
numero
chave
ambiente
status interno
status SEFAZ
protocolo
data de emissão
valor total
```

Ainda sem registros.

### fiscal_document_artifacts

Tabela prevista para armazenar artefatos do documento fiscal.

Tipos esperados:

```text
ini_origem
xml_gerado
xml_assinado
xml_autorizado
retorno_status_servico
retorno_autorizacao
retorno_consulta
retorno_cancelamento
retorno_inutilizacao
```

Ainda sem registros.

### fiscal_events

Tabela prevista para eventos fiscais e técnicos.

Exemplos:

```text
carregar_ini
assinar
validar_regras
status_servico
autorizar
consultar_recibo
rejeicao
cancelamento
inutilizacao
```

Ainda sem registros.

### fiscal_number_voids

Tabela prevista para inutilização de numeração.

Ainda sem registros.

### fiscal_logs

Tabela prevista para logs fiscais técnicos/auditoria.

Ainda sem registros.

### schema_migrations

Controla migrations aplicadas ao banco.

Migration atual:

```text
1 - initial_fiscal_core_schema
```

## Fluxo de leitura atual da API

Quando uma chamada fiscal recebe:

```json
{
  "emitter_id": "emit_lab_acbr_sample"
}
```

A API resolve no SQLite:

```text
1. fiscal_emitters
2. tenants
3. fiscal_configs
4. fiscal_sequences
5. fiscal_certificates
```

E monta o contexto fiscal:

```text
tenant
emitente
CNPJ
UF
ambiente
modelo
serie
próximo número
schemas
path salvar
certificado ativo
senha resolvida por password_secret_ref
```

## Rotas que já usam o banco

```text
GET  /api/emitentes
GET  /api/db/status
GET  /api/db/emitentes
POST /api/nfe/carregar-ini
POST /api/nfe/assinar
POST /api/nfe/validar-regras
POST /api/nfe/status-servico
```

## Próximo marco de persistência

A próxima evolução técnica deve gravar as operações fiscais em:

```text
fiscal_documents
fiscal_document_artifacts
fiscal_events
fiscal_logs
```

Primeira sugestão de persistência:

```text
POST /api/nfe/assinar
  -> criar fiscal_document em status assinado_localmente
  -> gravar XML gerado/assinado em fiscal_document_artifacts
  -> gravar evento nfe.assinar em fiscal_events
```

Para StatusServico:

```text
POST /api/nfe/status-servico
  -> gravar evento nfe.status_servico
  -> gravar retorno bruto da SEFAZ em fiscal_document_artifacts ou fiscal_logs
```

## Observações de segurança

- Senha de certificado não deve ser enviada ao frontend.
- O PFX não deve ficar em pasta pública.
- O endpoint deve retornar apenas `senha_configurada` e metadados não sensíveis.
- No futuro, a senha deve sair de `.env` para um mecanismo de segredo apropriado.
- Cada tenant deve acessar apenas seus próprios emitentes e documentos fiscais.