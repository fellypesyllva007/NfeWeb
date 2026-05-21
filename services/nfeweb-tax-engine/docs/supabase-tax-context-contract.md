# Contrato Supabase para Tax Engine

A Tax Engine não deve manter alíquotas, reduções, IVA, MVA, IPI, PIS, COFINS, ICMS, DIFAL, FCP, CFOP, CST, CSOSN ou regras por UF/NCM/produto no código.

Todos os parâmetros tributários devem vir de tabelas do banco de dados, com vigência, prioridade e vínculo com tenant/empresa/produto/operação quando aplicável.

## Regra de ouro

```text
Tax Engine:
  calcula
  resolve regra
  aplica fórmula
  totaliza
  gera snapshot

Supabase/Postgres:
  guarda todos os parâmetros fiscais mutáveis
  guarda alíquotas
  guarda reduções de base
  guarda IVA/MVA
  guarda CFOP/CST/CSOSN
  guarda regras por UF origem/destino
  guarda regras por NCM/CEST/produto
  guarda exceções por empresa/item
  guarda vigências
```

## Endpoint de produção

A API pública de cálculo deve receber apenas:

```json
{
  "tenantId": "tenant_lab",
  "documentId": "doc_lab_001",
  "mode": "official",
  "persistSnapshot": true
}
```

A Tax Engine usa `tenantId + documentId` para buscar todos os dados no Supabase.

## RPC obrigatória

A API espera que o Supabase exponha a função:

```sql
tax_engine_get_fiscal_context(
  p_tenant_id text,
  p_document_id text,
  p_mode text
) returns jsonb
```

Essa função deve retornar um JSON no formato `FiscalContext`, contendo dados da nota, itens e regras fiscais já carregadas das tabelas tributárias.

## RPC opcional para persistir snapshot

```sql
tax_engine_save_calculation_snapshot(
  p_result jsonb
) returns void
```

Ela deve persistir:

- cálculo por item;
- totalizadores;
- regra aplicada;
- exceções aplicadas;
- snapshot completo;
- versão da regra usada;
- data/hora do cálculo.

## Tabelas recomendadas

```text
tenants
fiscal_emitters
customers
products
orders
order_items
fiscal_documents
fiscal_document_items

fiscal_operations
tax_rules
tax_rule_conditions
tax_rule_outputs
tax_rates
tax_rate_uf_matrix
tax_rate_ncm
tax_rate_product
tax_mva_iva_rules
tax_reduction_rules
product_tax_settings
operation_tax_settings
company_tax_settings
fiscal_exceptions
fiscal_benefits
```

## tax_rates

Tabela genérica de alíquotas por imposto e vigência.

```text
id
tenant_id nullable
tax_type -- icms, ipi, pis, cofins, difal, fcp, icms_st
uf_origin nullable
uf_destination nullable
ncm nullable
ncm_prefix nullable
cest nullable
product_id nullable
operation_type nullable
tax_regime nullable
customer_kind nullable
icms_contributor nullable
final_consumer nullable
rate_percent numeric(9,4)
base_reduction_percent numeric(9,4) nullable
valid_from date
valid_until date nullable
priority integer
legal_reference text nullable
active boolean
created_at
updated_at
```

## tax_rate_uf_matrix

Tabela específica para alíquotas que dependem de UF origem e UF destino.

```text
id
tenant_id nullable
tax_type -- icms_interestadual, difal, fcp
uf_origin
uf_destination
rate_percent numeric(9,4)
fcp_percent numeric(9,4) nullable
valid_from date
valid_until date nullable
priority integer
legal_reference text nullable
active boolean
```

## tax_rate_ncm

Tabela para alíquotas por NCM/CEST, útil para IPI, PIS/COFINS, monofásico, ICMS específico e outras regras.

```text
id
tenant_id nullable
tax_type
ncm
cest nullable
uf_origin nullable
uf_destination nullable
tax_regime nullable
operation_type nullable
rate_percent numeric(9,4)
base_reduction_percent numeric(9,4) nullable
valid_from date
valid_until date nullable
priority integer
legal_reference text nullable
active boolean
```

## tax_rate_product

Tabela para parametrização específica do produto. Deve ter prioridade maior que NCM genérico.

```text
id
tenant_id
product_id
tax_type
uf_origin nullable
uf_destination nullable
operation_type nullable
rate_percent numeric(9,4)
base_reduction_percent numeric(9,4) nullable
valid_from date
valid_until date nullable
priority integer
legal_reference text nullable
active boolean
```

## tax_mva_iva_rules

Tabela para IVA/MVA e MVA ajustada.

```text
id
tenant_id nullable
uf_origin nullable
uf_destination nullable
ncm nullable
cest nullable
product_id nullable
operation_type nullable
tax_regime nullable
mva_percent numeric(9,4) nullable
iva_percent numeric(9,4) nullable
mva_adjusted_percent numeric(9,4) nullable
internal_destination_rate_percent numeric(9,4) nullable
interstate_rate_percent numeric(9,4) nullable
valid_from date
valid_until date nullable
priority integer
legal_reference text nullable
active boolean
```

## tax_reduction_rules

Tabela para reduções de base de cálculo por imposto.

```text
id
tenant_id nullable
tax_type
uf_origin nullable
uf_destination nullable
ncm nullable
cest nullable
product_id nullable
operation_type nullable
tax_regime nullable
reduction_percent numeric(9,4)
valid_from date
valid_until date nullable
priority integer
legal_reference text nullable
active boolean
```

## tax_rules

Tabela central que combina condições e outputs. Pode referenciar diretamente as tabelas de alíquotas ou armazenar um output materializado gerado pela RPC.

```text
id
tenant_id
name
priority
active
valid_from
valid_until
source -- tenant, product, uf, legal_exception, system
legal_reference
created_at
updated_at
```

## tax_rule_conditions

Condições para uma regra ser aplicável.

```text
id
tax_rule_id
tax_regimes[]
uf_origin[]
uf_destination[]
operation_types[]
ncm[]
ncm_prefix[]
cest[]
product_ids[]
customer_kind[]
icms_contributor
final_consumer
interstate
```

## tax_rule_outputs

Saída fiscal resolvida pela regra. A RPC pode montar este output combinando `tax_rates`, `tax_rate_ncm`, `tax_rate_product`, `tax_mva_iva_rules`, `tax_reduction_rules` e exceções.

```text
id
tax_rule_id
cfop
icms_cst
icms_csosn
icms_aliquota
icms_reducao_bc
ipi_cst
ipi_aliquota
pis_cst
pis_aliquota
cofins_cst
cofins_aliquota
difal_enabled
difal_aliquota_interna_destino
difal_aliquota_interestadual
fcp_aliquota
icms_st_enabled
icms_st_mva
icms_st_mva_ajustada
icms_st_aliquota_interna_destino
icms_st_reducao_bc
notes
```

## fiscal_exceptions

Para benefícios, decisões judiciais, regimes especiais e exceções por empresa/produto/item.

```text
id
tenant_id
emitter_id
product_id
ncm
tax_type
description
legal_reference
valid_from
valid_until
output_override jsonb
active
```

## Exemplo de retorno da RPC

A RPC deve retornar dados já resolvidos do banco. O exemplo abaixo contém alíquotas apenas porque representa o retorno da consulta ao banco, não valores fixos no código.

```json
{
  "tenantId": "tenant_lab",
  "emitterId": "emit_lab_acbr_sample",
  "documentId": "doc_lab_001",
  "mode": "official",
  "emitter": {
    "uf": "SP",
    "cnpj": "92390477000149",
    "taxRegime": "lucro_presumido",
    "crt": "3"
  },
  "customer": {
    "uf": "MG",
    "kind": "pj",
    "document": "00000000000191",
    "isIcmsContributor": true,
    "isFinalConsumer": false
  },
  "operation": {
    "type": "venda_mercadoria",
    "isInterstate": true,
    "naturezaOperacao": "Venda de mercadoria"
  },
  "items": [
    {
      "itemId": "1",
      "productId": "prod_1",
      "description": "Produto exemplo",
      "ncm": "85044090",
      "quantity": "1.0000",
      "unitPrice": "100.00"
    }
  ],
  "rules": [
    {
      "id": "rule_from_db_1",
      "tenantId": "tenant_lab",
      "name": "Regra resolvida pelo banco",
      "priority": 500,
      "active": true,
      "source": "tenant",
      "legalReference": "Referência legal cadastrada no banco",
      "conditions": {
        "taxRegime": ["lucro_presumido"],
        "ufOrigin": ["SP"],
        "ufDestination": ["MG"],
        "operationType": ["venda_mercadoria"],
        "ncm": ["85044090"],
        "interstate": true
      },
      "output": {
        "cfop": "6102",
        "icms": { "cst": "00", "aliquota": "12.0000" },
        "ipi": { "enabled": true, "cst": "50", "aliquota": "5.0000" },
        "pis": { "enabled": true, "cst": "01", "aliquota": "0.6500" },
        "cofins": { "enabled": true, "cst": "01", "aliquota": "3.0000" },
        "icmsSt": { "enabled": true, "mva": "40.0000", "aliquotaInternaDestino": "18.0000" }
      }
    }
  ],
  "exceptions": []
}
```

## Prioridade recomendada

```text
1. Override fiscal autorizado do item, se permitido por política do tenant
2. Exceção fiscal específica da empresa/produto
3. Regra específica do produto
4. Regra por NCM/CEST
5. Regra por operação fiscal
6. Matriz UF origem/destino
7. Regra por regime tributário
8. Regra padrão do tenant
```

## Proibição operacional

Não cadastrar alíquota em:

```text
src/rules/uf/*.ts
src/domain/*.ts
src/http/*.ts
examples/*.json para produção
```

Os exemplos podem conter apenas `tenantId`, `documentId`, `mode` e `persistSnapshot`.
