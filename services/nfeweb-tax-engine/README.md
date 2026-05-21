# NfeWeb Tax Engine API

Serviço TypeScript para cálculo tributário parametrizável da NfeWeb.

## Objetivo

A Tax Engine API resolve regras fiscais e calcula prévias/snapshots de impostos antes da emissão técnica pela ACBrLibNFe.

Ela não substitui contador, consultoria tributária, RICMS estadual, TIPI, notas técnicas ou validações oficiais da SEFAZ. A proposta é permitir parametrização auditável por tenant, empresa, regime, UF, operação, NCM/CEST, produto, cliente e exceções.

## Papel na arquitetura

```text
Vercel Frontend
  ↓
Supabase Auth/Postgres/Storage
  ↓
Oracle Cloud
  ├── nfeweb-tax-engine  ← este serviço
  └── nfeweb-api + ACBrLibNFe
        ↓
      SEFAZ
```

Fluxo recomendado:

```text
1. Frontend salva pedido/nota draft no Supabase.
2. Frontend chama /api/tax/preview para prévia de cálculo.
3. Usuário confirma emissão.
4. API fiscal Oracle chama /api/tax/calculate-document em modo official.
5. API fiscal usa o snapshot tributário para montar INI/XML.
6. ACBrLib assina, valida e transmite.
7. API fiscal atualiza Supabase com XML, protocolo, status e logs.
```

## Por que TypeScript

- O frontend React/Vite também usa TypeScript.
- O mesmo pacote de cálculo pode ser extraído futuramente e reaproveitado pelo frontend.
- O serviço pode rodar inicialmente no Oracle e depois ser movido para Render sem reescrever o motor.

## Endpoints

```text
GET  /health
GET  /api/tax/health
POST /api/tax/preview
POST /api/tax/calculate-document
POST /api/tax/calculate-item
```

## Instalação

```bash
cd services/nfeweb-tax-engine
npm install
npm run build
npm start
```

Modo desenvolvimento:

```bash
npm run dev
```

Por padrão escuta em:

```text
127.0.0.1:3340
```

Variáveis:

```text
PORT=3340
HOST=127.0.0.1
ALLOWED_ORIGINS=https://app.nfeweb.com.br,http://localhost:5173
```

## Exemplo de chamada

```bash
curl -X POST http://127.0.0.1:3340/api/tax/calculate-document \
  -H 'Content-Type: application/json' \
  --data @examples/calculate-document.sp.json
```

## Modelo mental das regras

A regra mais específica deve vencer. A prioridade deve ser configurada na tabela/regra.

Ordem recomendada:

```text
1. Override manual autorizado no item
2. Exceção fiscal/decisão judicial/regime especial da empresa
3. Regra específica do produto
4. Regra por NCM/CEST
5. Regra por operação fiscal
6. Regra por UF origem/destino
7. Regra por regime tributário
8. Regra padrão do tenant
```

## Separação por UF

O diretório `src/rules/uf` permite criar pacotes por estado:

```text
src/rules/uf/sp.ts
src/rules/uf/mg.ts
src/rules/uf/rj.ts
...
```

Esses pacotes devem ser tratados como seeds ou regras sistêmicas versionadas. Para produção, regras finais precisam estar no Supabase e vinculadas a tenant, emitente, produto, operação e vigência.

## O que a Tax Engine calcula hoje

- Base do item
- ICMS percentual simples
- IPI percentual simples
- PIS percentual simples
- COFINS percentual simples
- DIFAL simples
- ICMS-ST com MVA/MVA ajustada
- Totalizadores
- Snapshot por item
- Aplicação de exceções
- Override manual auditável por item

## O que ainda deve evoluir

- Busca de regras no Supabase por `tenant_id` e `document_id`
- Persistência do snapshot em `fiscal_document_items`
- Regras avançadas de ICMS-ST por UF/NCM/CEST
- FCP por UF/produto
- DIFAL por dentro quando aplicável
- PIS/COFINS monofásico, alíquota zero, suspensão, isenção
- IPI por TIPI/NCM/enquadramento
- Benefícios fiscais estaduais
- Validação cruzada com layout NF-e/ACBr
- Versionamento formal de regra aplicada

## Aviso fiscal importante

O Portal NF-e, notas técnicas e schemas ajudam no layout, campos e validações da NF-e. Eles não fornecem um motor tributário completo para todos os regimes, produtos, estados, benefícios e decisões judiciais. As regras deste serviço são parametrizáveis exatamente porque a tributação brasileira depende de empresa, regime, UF, operação, NCM, CEST, cliente, produto e exceções específicas.
