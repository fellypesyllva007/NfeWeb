# Evidências de testes da API fiscal e SEFAZ

Data: 2026-05-20
Ambiente: Oracle Cloud Ampere ARM64, Ubuntu 22.04 arm64
Domínio: `webnfe.ddns.net`
Serviço: `nfeweb-api`
Versão: `0.9.0`

## Objetivo

Registrar as evidências principais dos testes realizados na API fiscal até o primeiro acesso ao webservice oficial da SEFAZ em homologação.

## Ambiente validado

API local:

```text
127.0.0.1:3333
```

API pública via Nginx:

```text
http://webnfe.ddns.net/api
```

Health check validado:

```text
GET /api/health -> 200 OK
version: 0.9.0
arch: aarch64
python: 3.10.12
```

## Banco SQLite

Arquivo:

```text
/var/lib/nfeweb/nfeweb.sqlite3
```

Endpoint validado:

```text
GET /api/db/status -> 200 OK
```

Contadores principais:

```text
tenants: 1
fiscal_emitters: 1
fiscal_certificates: 1
fiscal_configs: 1
fiscal_sequences: 1
```

## Emitente fiscal de laboratório

Endpoint validado:

```text
GET /api/emitentes -> 200 OK
```

Emitente:

```text
tenant_id: tenant_lab
emitter_id: emit_lab_acbr_sample
cnpj: 92390477000149
razao_social: RAZAO SOCIAL - LAB ACBr
uf: SP
ambiente: 1
modelo: 55
serie: 1
proximo_numero: 1
certificado_ativo: 1
```

## Remoção da rota antiga

Endpoint antigo:

```text
GET /api/clientes
```

Resultado validado:

```text
HTTP/1.1 410 Gone
```

Mensagem:

```text
A rota /clientes foi removida. Use /api/emitentes; a fonte única agora é o SQLite.
```

Conclusão:

```text
A API não usa mais clientes.json como fonte operacional.
```

## Teste: chamada sem emitter_id

Endpoint:

```text
POST /api/nfe/assinar
```

Payload:

```json
{
  "include_xml": false
}
```

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

Conclusão:

```text
Não existe fallback operacional para cliente/emitente.
```

## Teste: carregar INI

Endpoint:

```text
POST /api/nfe/carregar-ini
```

Payload:

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

## Teste: assinar XML

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

Resultado validado:

```text
status: ok
operacao: nfe.assinar
emitente.emitter_id: emit_lab_acbr_sample
certificado.certificate_id: cert_lab_acbr_sample
certificado.senha_len: 4
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
Assinatura XML local validada com ACBrLibNFe ARM64, OpenSSL 3 e PFX com senha.
```

## Teste: validar regras de negócio

Endpoint:

```text
POST /api/nfe/validar-regras
```

Payload:

```json
{
  "emitter_id": "emit_lab_acbr_sample"
}
```

Resultado validado:

```text
status: ok
operacao: nfe.validar_regras
emitente.emitter_id: emit_lab_acbr_sample
carregar_ini.ret: 0
validar_regras.ret: 0
limpar_lista.ret: 0
```

Rejeições esperadas do XML de exemplo:

```text
228 - Data de Emissão muito atrasada
505 - Data de Entrada/Saída anterior ao permitido
533 - Total da BC ICMS-ST difere do somatório dos itens
534 - Total do ICMS-ST difere do somatório dos itens
862 - Total do FCP ST difere do somatório dos itens
610 - Total da NF difere do somatório dos valores
866 - Ausência de troco quando pagamentos informados excedem o total da nota
```

## Teste: StatusServico SEFAZ homologação

Endpoint:

```text
POST /api/nfe/status-servico
```

Payload:

```json
{
  "emitter_id": "emit_lab_acbr_sample"
}
```

Ambiente usado:

```text
ambiente_original_banco: 1
ambiente_acbrlib: 1
ambiente_nome: homologacao
tpAmb_sefaz_equivalente: 2
```

Certificado usado:

```text
/home/ubuntu/certificados/nfe-teste-acbr-sample-1234.pfx
senha_len: 4
```

URL oficial resolvida pela ACBrLib:

```text
https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx
```

Resultado observado:

```text
status: ok
operacao: nfe.status_servico
status_servico.ret: -10
Erro Interno: 0
Erro HTTP: 403
403 - Forbidden: Access is denied.
```

Mensagem HTML retornada pela SEFAZ:

```text
You do not have permission to view this directory or page using the credentials that you supplied.
```

## Conclusão do teste SEFAZ

O teste de StatusServico demonstrou que:

```text
✅ ACBrLib inicializou corretamente
✅ Ambiente ACBrLib=1 foi aceito como homologação
✅ A ACBrLib resolveu a URL oficial da SEFAZ SP em homologação
✅ A API alcançou o webservice oficial
⚠️ A SEFAZ retornou HTTP 403 com certificado autoassinado
```

Interpretação:

```text
O projeto chegou ao limite esperado para certificado de laboratório.
A próxima barreira é credencial/certificado ICP-Brasil válido e CNPJ habilitado/credenciado.
```

## Próximo desbloqueio real

Para avançar além do HTTP 403:

```text
1. Obter certificado A1 ICP-Brasil válido.
2. Garantir CNPJ compatível com emitente.
3. Garantir credenciamento/habilitação na SEFAZ da UF.
4. Cadastrar certificado no SQLite.
5. Reexecutar POST /api/nfe/status-servico.
6. Esperar retorno com cStat/xMotivo da SEFAZ.
```

## Observação sobre /tmp

O systemd está configurado com:

```text
PrivateTmp=true
```

Portanto, arquivos gerados em `/tmp` pelo serviço podem não aparecer no `/tmp` da sessão SSH.

Isso foi observado ao tentar ler:

```text
/tmp/nfeweb-api-acbr/acbrlib-offline.ini
```

a partir do terminal SSH.