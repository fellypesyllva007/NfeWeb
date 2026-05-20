# Arquitetura em camadas da NfeWeb API

Data: 2026-05-20
Projeto: NfeWeb / Nota Fiscal Eletrônica
Serviço atual: `nfeweb-api`
Versão registrada: `0.9.0`
Ambiente atual: Ubuntu 22.04 ARM64/aarch64 em Oracle Cloud Ampere
Domínio público atual: `webnfe.ddns.net`

## Objetivo

Este documento registra a arquitetura atual do projeto NfeWeb em 11 camadas, detalhando a função de cada camada, a tecnologia usada, a linguagem predominante e o estado validado até o momento.

## Visão geral do fluxo

```text
Usuário / futuro ERPWeb
        ↓
Nginx público
        ↓
systemd / nfeweb-api.service
        ↓
NfeWeb API
        ↓
SQLite fiscal core
        ↓
Bridge Python/ctypes
        ↓
ACBrLibNFe ARM64
        ↓
OpenSSL / LibXml2
        ↓
Certificado A1
        ↓
SEFAZ
```

## Resumo executivo

Hoje o projeto é uma API fiscal em Python, servida por Nginx e systemd, usando SQLite como núcleo fiscal inicial, chamando a ACBrLibNFe compilada em ARM64 a partir de Object Pascal/Free Pascal. A API já assina XML localmente, valida regras de negócio e alcança o webservice oficial da SEFAZ SP em homologação. A comunicação oficial completa ainda depende de certificado ICP-Brasil real e CNPJ habilitado/credenciado.

---

# 1. Camada de entrada pública — Nginx

## Função

Receber requisições HTTP públicas no domínio `webnfe.ddns.net` e encaminhar para a API interna que roda apenas no loopback.

Fluxo atual:

```text
http://webnfe.ddns.net/api/...
        ↓
http://127.0.0.1:3333/...
```

## Tecnologia

```text
Nginx
```

Versão observada:

```text
nginx/1.18.0 (Ubuntu)
```

## Linguagem usada

```text
Configuração Nginx
```

Não é uma linguagem de programação da aplicação. É uma configuração declarativa de servidor/proxy.

## Responsabilidades atuais

- Expor o domínio público `webnfe.ddns.net`.
- Fazer proxy reverso para `127.0.0.1:3333`.
- Manter a API sem exposição direta à internet.
- Concentrar futura configuração HTTPS/TLS pública.
- Permitir evolução para rotas separadas entre frontend e backend.

## Estado validado

```text
GET http://webnfe.ddns.net/api/health -> 200 OK
GET http://webnfe.ddns.net/api/acbr/info -> 200 OK
GET http://webnfe.ddns.net/api/emitentes -> 200 OK
POST http://webnfe.ddns.net/api/nfe/status-servico -> alcança SEFAZ homologação
```

## Observação futura

Quando HTTPS for ativado, esta camada deverá receber certificado TLS público do domínio, por exemplo via Let's Encrypt/Certbot. Esse certificado do domínio é diferente do certificado A1 usado para NF-e.

---

# 2. Camada de serviço Linux — systemd

## Função

Manter a API fiscal rodando como serviço do Ubuntu.

## Tecnologia

```text
systemd
```

Serviço atual:

```text
nfeweb-api.service
```

## Linguagem usada

```text
Unit file systemd
```

Arquivo de unidade `.service`, com sintaxe própria do systemd.

## Execução atual

O serviço executa:

```text
/usr/bin/python3 /home/ubuntu/NfeWeb/services/nfeweb-api/server.py
```

Diretório de trabalho:

```text
/home/ubuntu/NfeWeb
```

Arquivo de ambiente:

```text
/etc/nfeweb/nfeweb-api.env
```

## Responsabilidades atuais

- Iniciar a API no boot.
- Reiniciar a API em caso de falha.
- Injetar variáveis de ambiente.
- Padronizar logs via `journalctl`.
- Isolar parte do ambiente de execução.

## Configuração relevante

```text
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/NfeWeb
EnvironmentFile=/etc/nfeweb/nfeweb-api.env
Restart=always
PrivateTmp=true
ProtectSystem=full
ProtectHome=false
```

## Observação sobre PrivateTmp

Como o serviço usa:

```text
PrivateTmp=true
```

arquivos criados pela API em `/tmp` podem não aparecer no `/tmp` da sessão SSH. Isso foi observado ao tentar ler, via terminal SSH, o arquivo:

```text
/tmp/nfeweb-api-acbr/acbrlib-offline.ini
```

## Estado validado

```text
systemctl status nfeweb-api --no-pager
Active: active (running)
```

---

# 3. Camada da API fiscal — NfeWeb API

## Função

Expor endpoints HTTP para o futuro ERPWeb/front e orquestrar chamadas fiscais usando SQLite, ACBrLibNFe e certificado digital.

## Tecnologia

```text
Python HTTP server
```

## Linguagem usada

```text
Python 3.10
```

Versão observada:

```text
Python 3.10.12
```

## Arquivos principais

```text
services/nfeweb-api/server.py
services/nfeweb-api/nfe_offline.py
services/nfeweb-api/fiscal_gateway.py
services/nfeweb-api/database.py
```

## Responsabilidades atuais

- Receber requisições HTTP.
- Validar payload JSON.
- Exigir `emitter_id` nos endpoints fiscais.
- Resolver emitente no SQLite.
- Resolver certificado ativo.
- Resolver senha via referência de segredo.
- Configurar ACBrLibNFe.
- Executar operações fiscais.
- Retornar JSON padronizado.
- Encapsular erros da ACBrLib em resposta HTTP.

## Endpoints atuais

Diagnóstico:

```text
GET /api/health
GET /api/acbr/info
GET /api/emitentes
GET /api/db/status
GET /api/db/emitentes
```

NF-e:

```text
POST /api/nfe/gerar-chave
POST /api/nfe/carregar-ini
POST /api/nfe/assinar
POST /api/nfe/validar-regras
POST /api/nfe/status-servico
```

## Payload fiscal padrão

```json
{
  "emitter_id": "emit_lab_acbr_sample"
}
```

Para testes sem XML completo:

```json
{
  "emitter_id": "emit_lab_acbr_sample",
  "include_xml": false
}
```

## Regra importante

Sem `emitter_id`, os endpoints fiscais devem recusar a chamada.

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

## Estado validado

```text
GET /api/health -> 200 OK, version 0.9.0
POST /api/nfe/carregar-ini -> ret 0
POST /api/nfe/assinar -> ret 0, contem_signature true
POST /api/nfe/validar-regras -> ret 0
POST /api/nfe/status-servico -> chegou na SEFAZ SP homologação e recebeu HTTP 403
```

---

# 4. Camada de persistência fiscal — SQLite

## Função

Guardar o núcleo fiscal inicial do projeto: tenants, emitentes, certificados, configuração fiscal, numeração e futuramente documentos, eventos e logs fiscais.

## Tecnologia

```text
SQLite
```

## Linguagem usada

```text
SQL
```

Acesso feito pela aplicação em:

```text
Python + sqlite3
```

## Arquivo atual

```text
/var/lib/nfeweb/nfeweb.sqlite3
```

## Tabelas atuais

```text
tenants
users
tenant_users
fiscal_emitters
fiscal_certificates
fiscal_configs
fiscal_sequences
erp_references
fiscal_documents
fiscal_document_artifacts
fiscal_events
fiscal_number_voids
fiscal_logs
schema_migrations
```

## Dados seed atuais

Tenant:

```text
tenant_id: tenant_lab
nome: Laboratório ACBr
slug: lab-acbr
status: active
```

Emitente:

```text
emitter_id: emit_lab_acbr_sample
cnpj: 92390477000149
razao_social: RAZAO SOCIAL - LAB ACBr
uf: SP
ambiente: 1
modelo: 55
serie: 1
proximo_numero: 1
```

Certificado:

```text
certificate_id: cert_lab_acbr_sample
pfx_path: /home/ubuntu/certificados/nfe-teste-acbr-sample-1234.pfx
password_secret_ref: env:NFE_PFX_PASSWORD
is_active: 1
```

## Responsabilidades atuais

- Ser a fonte única de emitentes fiscais.
- Ser a fonte única de certificado ativo.
- Guardar configuração fiscal por emitente/modelo/série.
- Guardar controle de numeração fiscal.
- Preparar base para persistir documentos e eventos fiscais.

## Rotas que já usam o SQLite

```text
GET  /api/emitentes
GET  /api/db/status
GET  /api/db/emitentes
POST /api/nfe/carregar-ini
POST /api/nfe/assinar
POST /api/nfe/validar-regras
POST /api/nfe/status-servico
```

## O que foi removido

O arquivo `clientes.json` não é mais fonte operacional.

A rota antiga:

```text
GET /api/clientes
```

retorna:

```text
410 Gone
```

## Próxima evolução esperada

Gravar resultados fiscais em:

```text
fiscal_documents
fiscal_document_artifacts
fiscal_events
fiscal_logs
```

---

# 5. Camada de integração ACBr — Python ctypes

## Função

Fazer a ponte entre o código Python da API e a biblioteca nativa `libacbrnfe_arm64.so`.

## Tecnologia

```text
ctypes
```

## Linguagem usada

```text
Python chamando C ABI
```

O `ctypes` permite chamar funções exportadas por bibliotecas nativas `.so`.

## Arquivos principais

```text
services/nfeweb-api/nfe_offline.py
services/nfeweb-api/fiscal_gateway.py
```

## Funções ACBrLib declaradas/usadas

```text
NFE_Inicializar
NFE_Finalizar
NFE_UltimoRetorno
NFE_ConfigGravarValor
NFE_CarregarINI
NFE_ObterXml
NFE_Assinar
NFE_VerificarAssinatura
NFE_ValidarRegrasdeNegocios
NFE_StatusServico
NFE_LimparLista
NFE_Nome
NFE_Versao
NFE_OpenSSLInfo
NFE_GerarChave
```

## Responsabilidades atuais

- Carregar a biblioteca `.so`.
- Declarar assinatura das funções nativas.
- Converter strings e buffers entre Python e C.
- Inicializar e finalizar corretamente a ACBrLib.
- Aplicar configurações fiscais via `NFE_ConfigGravarValor`.
- Capturar `UltimoRetorno`.
- Tratar erros da ACBrLib.

## Estado validado

```text
NFE_Inicializar: ret=0
NFE_Nome: ACBrLibNFE
NFE_Versao: 1.5.0.455
NFE_OpenSSLInfo: OpenSSL 3.0.2
NFE_Finalizar: ret=0
```

---

# 6. Camada fiscal nativa — ACBrLibNFe

## Função

Executar as operações fiscais NF-e: gerar chave, carregar INI, gerar XML, assinar, validar regras, consultar status da SEFAZ e futuramente autorizar, consultar, cancelar e inutilizar NF-e.

## Tecnologia

```text
ACBrLibNFe
```

## Linguagem original

```text
Object Pascal / Free Pascal / Lazarus
```

## Formato usado pela API

Biblioteca compartilhada Linux ARM64:

```text
/home/ubuntu/acbr-arm64-lab/ACBr/Projetos/ACBrLib/Fontes/NFe/bin/Linux/CONSOLE-MT/libacbrnfe_arm64.so
```

## Arquitetura validada

```text
ELF 64-bit LSB shared object, ARM aarch64
```

## Responsabilidades atuais

- Gerar chave NF-e.
- Carregar INI de NF-e.
- Gerar XML.
- Assinar XML.
- Verificar assinatura.
- Validar regras de negócio.
- Resolver endpoint oficial da SEFAZ por UF/ambiente.
- Executar `StatusServico` em homologação.

## URL resolvida pela ACBrLib em teste real

```text
https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx
```

## Regra de ambiente ACBrLib

A ACBrLib usa enum:

```pascal
TpcnTipoAmbiente = (taProducao, taHomologacao)
```

Portanto:

```text
Ambiente=0 -> produção
Ambiente=1 -> homologação
```

Isso é diferente do XML/SEFAZ:

```text
tpAmb=1 -> produção
tpAmb=2 -> homologação
```

---

# 7. Camada criptográfica — OpenSSL e LibXml2

## Função

Fornecer suporte a certificado, PFX, assinatura digital, TLS/HTTPS e assinatura XML.

## Tecnologias

```text
OpenSSL 3.0.2
LibXml2
```

## Linguagem original

```text
C / C++ nativo
```

A aplicação Python não chama diretamente essas bibliotecas. A ACBrLibNFe as utiliza internamente.

## Configuração ACBrLib validada

```text
SSLCryptLib=1
SSLHttpLib=3
SSLXmlSignLib=4
```

Interpretação operacional:

```text
SSLCryptLib = OpenSSL
SSLHttpLib = OpenSSL
SSLXmlSignLib = LibXml2
```

## OpenSSL providers

No Ubuntu 22.04 com OpenSSL 3, foi necessário carregar providers:

```text
default
legacy
```

Arquivo de configuração atual:

```text
/etc/nfeweb/openssl-acbr.cnf
```

Conteúdo conceitual:

```ini
openssl_conf = openssl_init

[openssl_init]
providers = provider_sect
alg_section = algorithm_sect

[provider_sect]
default = default_sect
legacy = legacy_sect

[default_sect]
activate = 1

[legacy_sect]
activate = 1

[algorithm_sect]
default_properties =
```

## Responsabilidades atuais

- Ler PFX.
- Validar senha do PFX.
- Disponibilizar algoritmos usados pela ACBrLib.
- Assinar XML.
- Fazer conexão HTTPS para SEFAZ.

## Estado validado

Sem providers corretos, PFX com senha apresentou erro de rotina criptográfica.

Com providers `default` e `legacy`, a assinatura local funcionou:

```text
NFE_Assinar: ret=0
NFE_VerificarAssinatura: ret=0
contem_signature=True
```

---

# 8. Camada de certificados

## Função

Armazenar e configurar certificados A1 usados para assinatura local e comunicação fiscal.

## Tecnologia atual

```text
Arquivo PFX A1
Variáveis de ambiente
Registro no SQLite
```

## Linguagens envolvidas

```text
OpenSSL CLI para gerar/validar PFX
SQL para registrar metadados
Python para resolver senha e configurar ACBrLib
```

## Certificado atual de laboratório

```text
/home/ubuntu/certificados/nfe-teste-acbr-sample-1234.pfx
```

Senha de laboratório:

```text
1234
```

Variável usada:

```text
NFE_PFX_PASSWORD=1234
```

Registro no SQLite:

```text
password_secret_ref = env:NFE_PFX_PASSWORD
```

## Regra de segurança atual

A senha do certificado não deve ser retornada pela API.

A API pode retornar apenas:

```text
senha_configurada: true
senha_len: 4
```

## Resultado local validado

Com o certificado autoassinado, a API conseguiu:

```text
carregar INI
gerar XML
assinar XML
verificar assinatura
validar regras locais
```

## Resultado contra SEFAZ

Com o mesmo certificado autoassinado, o endpoint `StatusServico` chegou na SEFAZ homologação, mas recebeu:

```text
HTTP 403 Forbidden
```

Conclusão:

```text
Certificado autoassinado serve para laboratório local, mas não para acesso oficial SEFAZ.
```

## Próxima exigência

Para avançar com SEFAZ, será necessário certificado:

```text
ICP-Brasil A1/A3
CNPJ compatível com o emitente
CNPJ habilitado/credenciado na SEFAZ da UF
```

---

# 9. Camada SEFAZ

## Função

Receber requisições oficiais de NF-e: status do serviço, autorização, consulta, inutilização, cancelamento e demais eventos fiscais.

## Tecnologia

```text
WebServices oficiais NF-e
SOAP/XML sobre HTTPS
Autenticação por certificado digital
```

## Linguagem

Camada externa, fora do controle do projeto. O projeto consome serviços publicados pela SEFAZ.

## Serviço já testado

```text
NFE_StatusServico
```

Endpoint resolvido pela ACBrLib:

```text
https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx
```

## Resultado atual

```text
status_servico.ret: -10
Erro HTTP: 403
403 - Forbidden: Access is denied.
```

## Interpretação

O projeto chegou à SEFAZ, mas o certificado autoassinado não teve permissão.

Validações obtidas:

```text
ACBrLib inicializou
OpenSSL funcionou
ambiente de homologação foi resolvido corretamente
URL oficial SP homologação foi alcançada
SEFAZ respondeu HTTP 403
```

## Próximo passo real

Executar o mesmo endpoint com certificado ICP-Brasil válido e CNPJ habilitado.

Resultado esperado com certificado correto:

```text
retorno SEFAZ com cStat/xMotivo
```

---

# 10. Camada de scripts, deploy e documentação

## Função

Automatizar instalação, testes, validação e registrar decisões técnicas.

## Tecnologias

```text
Bash
Python
Markdown
Git
```

## Linguagens usadas

```text
Shell Script
Python
Markdown
```

## Diretórios relevantes

```text
lab/acbr-arm64/scripts/
lab/acbr-arm64/docs/
deploy/ubuntu/
deploy/systemd/
services/nfeweb-api/docs/
```

## Exemplos de scripts e documentos

Scripts:

```text
lab/acbr-arm64/scripts/12-testar-assinatura-com-openssl-providers.sh
lab/acbr-arm64/scripts/14-assinar-com-senha-via-configgravarvalor.py
```

Documentos:

```text
lab/acbr-arm64/docs/status-validacao-arm64.md
lab/acbr-arm64/docs/ambientes-acbrlib-vs-sefaz.md
lab/acbr-arm64/docs/certificados-lab-vs-sefaz.md
lab/acbr-arm64/docs/evidencias-testes-api-sefaz.md
services/nfeweb-api/docs/endpoints-fiscais.md
services/nfeweb-api/docs/banco-sqlite-fiscal-core.md
```

## Responsabilidades atuais

- Registrar evidências de teste.
- Registrar decisões técnicas.
- Permitir reprodução de testes.
- Guiar deploy Ubuntu.
- Guiar contribuições futuras.
- Evitar perda de contexto entre etapas.

## Estado validado

Os documentos já registram:

```text
ACBrLibNFe ARM64 validada
PFX com senha validado
OpenSSL providers default + legacy
SQLite como fonte única
Endpoints fiscais atuais
StatusServico alcançando SEFAZ homologação
HTTP 403 com certificado autoassinado
```

---

# 11. Camada futura — ERPWeb / Frontend

## Função futura

Fornecer interface web para login, cadastro e operação fiscal dentro do ERPWeb do cliente.

## Tecnologia ainda não definida

Possíveis tecnologias para frontend:

```text
JavaScript
TypeScript
React
Vue
Angular
ou outro framework web
```

Possíveis tecnologias para backend ERPWeb:

```text
Ainda a definir
```

## Linguagem esperada

Provavelmente:

```text
TypeScript / JavaScript no frontend
```

A linguagem do ERPWeb backend ainda será definida conforme a arquitetura geral.

## Papel esperado do ERPWeb

O ERPWeb deverá ter:

```text
login de usuários
cadastro de tenants/clientes
cadastro de emitentes fiscais
cadastro de certificado do cliente
cadastro de clientes comerciais
cadastro de produtos
pedidos/vendas
contas a receber
estoque
emissão fiscal
consulta de notas
histórico fiscal
```

## Integração esperada com NfeWeb API

O frontend/ERPWeb não deve chamar a ACBrLib diretamente.

Fluxo correto:

```text
ERPWeb
  ↓
NfeWeb API
  ↓
SQLite fiscal core
  ↓
ACBrLibNFe
  ↓
SEFAZ
```

Payload fiscal futuro deve carregar o contexto do usuário logado e selecionar o emitente fiscal correto:

```json
{
  "emitter_id": "emitente_do_cliente_logado",
  "dados_nota": {}
}
```

## Regras importantes para o futuro

- O frontend nunca deve receber senha do certificado.
- O frontend nunca deve manipular PFX diretamente em fluxo comum.
- Cada tenant deve acessar apenas seus próprios emitentes.
- Cada emitente deve ter sua própria configuração fiscal.
- Cada emitente deve ter sua própria numeração NF-e.
- XML gerado, XML assinado, retorno SEFAZ e rejeições devem ser persistidos.
- O ERPWeb deve enxergar a API fiscal como um serviço interno de emissão.

## Próxima evolução esperada

Antes de uma interface completa, a API precisa persistir:

```text
notas emitidas
XML gerado
XML assinado
retornos SEFAZ
rejeições
logs fiscais
vínculos com pedidos/vendas do ERPWeb
```

---

# Mapa final por camada, tecnologia e linguagem

| Camada | Tecnologia | Linguagem predominante | Função |
|---|---|---|---|
| 1. Entrada pública | Nginx | Configuração Nginx | Proxy reverso público |
| 2. Serviço Linux | systemd | Unit file | Manter API ativa |
| 3. API fiscal | Python HTTP server | Python 3.10 | Endpoints fiscais |
| 4. Persistência | SQLite | SQL + Python sqlite3 | Núcleo fiscal multiempresa |
| 5. Bridge ACBr | ctypes | Python chamando C ABI | Chamar `.so` nativa |
| 6. Fiscal nativa | ACBrLibNFe | Object Pascal / Free Pascal | Operações NF-e |
| 7. Criptografia | OpenSSL / LibXml2 | C/C++ nativo | TLS, PFX, assinatura XML |
| 8. Certificados | PFX A1 + env + SQLite | OpenSSL CLI / SQL / Python | Certificado fiscal |
| 9. SEFAZ | SOAP/XML HTTPS | Externa | Webservices oficiais |
| 10. Scripts/docs | Bash/Python/Markdown | Shell, Python, Markdown | Deploy, testes, documentação |
| 11. ERPWeb futuro | A definir | Provável TypeScript/JavaScript | Login, cadastro e operação |

# Estado atual em uma frase

A NfeWeb API está funcionando como uma camada fiscal Python sobre ACBrLibNFe ARM64, com SQLite como fonte única de configuração fiscal, Nginx como entrada pública e systemd como supervisor, já validada para assinatura local e acesso ao StatusServico da SEFAZ SP em homologação, restando certificado ICP-Brasil real para avançar na comunicação oficial completa.
