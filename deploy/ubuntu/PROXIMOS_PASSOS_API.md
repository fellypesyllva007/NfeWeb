# Próximos passos da API NfeWeb

Data: 2026-05-20
Servidor: Oracle Cloud Ampere ARM64, Ubuntu 22.04 arm64
Domínio: `webnfe.ddns.net`

## Estado atual

A infraestrutura base está pronta:

```text
Nginx ativo
Domínio webnfe.ddns.net respondendo HTTP 200
UFW ativo com OpenSSH e Nginx Full liberados
systemd service nfeweb-api instalado e habilitado
arquivo de ambiente /etc/nfeweb/nfeweb-api.env criado
OpenSSL providers configurados em /etc/nfeweb/openssl-acbr.cnf
ACBrLibNFe ARM64 validada em lab
PFX com senha validado via ACBrLibNFe ARM64
```

Arquitetura alvo:

```text
Internet
  -> Nginx webnfe.ddns.net:80/:443
  -> 127.0.0.1:3333
  -> NfeWeb API / fiscal-service
  -> libacbrnfe_arm64.so
  -> SEFAZ homologação/produção
```

## Marco 1 — Criar API mínima com `/health`

Objetivo: substituir o placeholder `sleep infinity` por uma API real escutando em `127.0.0.1:3333`.

Endpoint mínimo:

```text
GET /health
```

Resposta esperada:

```json
{
  "status": "ok",
  "service": "nfeweb-api"
}
```

Validações esperadas:

```bash
curl -i http://127.0.0.1:3333/health
curl -i http://webnfe.ddns.net/health
curl -i http://webnfe.ddns.net/api/health
```

Resultado esperado:

```text
HTTP/1.1 200 OK
```

## Marco 2 — Ajustar `systemd` para iniciar a API real

Arquivo:

```text
/etc/systemd/system/nfeweb-api.service
```

O `ExecStart` atual é placeholder:

```ini
ExecStart=/usr/bin/env bash -lc 'echo "Configure ExecStart para o backend real"; sleep infinity'
```

Deve ser trocado pelo comando real da API.

Exemplos possíveis:

```ini
ExecStart=/usr/bin/node dist/server.js
```

ou:

```ini
ExecStart=/home/ubuntu/NfeWeb/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 3333
```

Depois de alterar:

```bash
sudo systemctl daemon-reload
sudo systemctl restart nfeweb-api
systemctl status nfeweb-api --no-pager
journalctl -u nfeweb-api -f
```

## Marco 3 — Criar endpoint de diagnóstico da ACBrLib

Objetivo: garantir que a API consegue carregar a `libacbrnfe_arm64.so` usando as variáveis do ambiente.

Endpoint sugerido:

```text
GET /acbr/info
```

Deve retornar:

```json
{
  "nome": "ACBrLibNFE",
  "versao": "1.5.0.455",
  "openssl": "OpenSSL 3.0.2 ...",
  "arch": "aarch64"
}
```

Funções ACBrLib usadas:

```text
NFE_Inicializar
NFE_Nome
NFE_Versao
NFE_OpenSSLInfo
NFE_Finalizar
```

Validação:

```bash
curl -s http://webnfe.ddns.net/api/acbr/info | jq
```

## Marco 4 — Criar camada `FiscalGateway`

Objetivo: isolar chamadas diretas da ACBrLib em uma camada própria.

Responsabilidade da camada:

```text
carregar libacbrnfe_arm64.so
inicializar/finalizar handles
aplicar configurações DFe
aplicar ArquivoPFX e Senha por NFE_ConfigGravarValor
tratar buffers de retorno
traduzir códigos de erro ACBrLib para respostas JSON
salvar XMLs em /var/lib/nfeweb/notas
registrar logs em /var/log/nfeweb
```

Regra importante:

```text
OPENSSL_CONF e OPENSSL_MODULES precisam existir no ambiente antes do processo carregar a libacbrnfe_arm64.so.
```

## Marco 5 — Endpoints NF-e offline

Criar endpoints que não dependem de SEFAZ.

### `POST /nfe/gerar-chave`

Usa:

```text
NFE_GerarChave
```

### `POST /nfe/carregar-ini`

Usa:

```text
NFE_CarregarINI
NFE_ObterXml
```

### `POST /nfe/assinar`

Usa:

```text
NFE_ConfigGravarValor("DFe", "ArquivoPFX", ...)
NFE_ConfigGravarValor("DFe", "Senha", ...)
NFE_Assinar
NFE_VerificarAssinatura
NFE_ObterXml
```

### `POST /nfe/validar-regras`

Usa:

```text
NFE_ValidarRegrasdeNegocios
```

Esses endpoints validam o motor fiscal antes de abrir comunicação com SEFAZ.

## Marco 6 — Modelo multi-cliente

O `.env` atual usa apenas um certificado de teste global. Isso serve para o lab, mas não serve para produção multi-cliente.

Modelo real por cliente:

```text
cliente_id
razao_social
cnpj
uf
ambiente: homologacao/producao
caminho do PFX ou PFX criptografado
senha do PFX protegida
serie NF-e
proximo numero NF-e
CSC/token, se NFC-e
status ativo/inativo
```

Fluxo futuro:

```text
requisição recebe cliente_id
  -> API busca configuração fiscal do cliente
  -> aplica UF, ambiente, ArquivoPFX e Senha
  -> gera/assina/valida/envia NF-e daquele cliente
```

Regra de segurança:

```text
não versionar PFX
não versionar senha
não logar senha
não retornar senha em endpoint
```

## Marco 7 — Banco de dados

Definir armazenamento para:

```text
clientes
certificados
configurações fiscais
numeração de NF-e
notas emitidas
XML enviado
XML autorizado
protocolo de autorização
eventos de cancelamento
inutilizações
logs fiscais
```

Campos mínimos de uma nota:

```text
id
cliente_id
modelo
serie
numero
chave_acesso
ambiente
status
xml_assinado_path
xml_autorizado_path
protocolo
motivo_rejeicao
created_at
updated_at
```

## Marco 8 — SEFAZ homologação

Depois dos endpoints offline funcionarem, testar comunicação com SEFAZ.

Endpoints sugeridos:

```text
GET  /sefaz/status-servico/:cliente_id
POST /nfe/enviar/:cliente_id
POST /nfe/consultar/:cliente_id
POST /nfe/cancelar/:cliente_id
POST /nfe/inutilizar/:cliente_id
```

Funções ACBrLib a validar:

```text
NFE_StatusServico
NFE_Enviar
NFE_Consultar
NFE_Cancelar
NFE_Inutilizar
```

Pré-requisito:

```text
certificado A1 ICP-Brasil real
ambiente de homologação configurado
cliente fiscal autorizado a emitir NF-e/NFC-e
```

## Marco 9 — HTTPS

Quando a API mínima estiver respondendo, habilitar HTTPS.

Sugestão:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d webnfe.ddns.net
```

Depois validar:

```bash
curl -i https://webnfe.ddns.net/
curl -i https://webnfe.ddns.net/health
```

## Marco 10 — Frontend

Depois da API mínima e endpoints fiscais offline:

```text
criar tela de login
criar cadastro de cliente/emitente
criar upload seguro de certificado A1
criar tela de configuração fiscal
criar tela de emissão NF-e
criar listagem de notas
criar download XML/PDF
```

O frontend deve consumir:

```text
https://webnfe.ddns.net/api/...
```

## Ordem recomendada imediata

1. Criar API mínima com `GET /health`.
2. Atualizar `ExecStart` do `nfeweb-api.service`.
3. Confirmar que `webnfe.ddns.net/health` deixa de retornar 502.
4. Criar `GET /acbr/info`.
5. Criar `POST /nfe/assinar` usando o PFX de teste.
6. Desenhar modelo multi-cliente.
7. Só depois avançar para SEFAZ homologação.
