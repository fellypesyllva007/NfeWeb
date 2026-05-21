# Contrato Supabase para Tax Engine

A Tax Engine não deve manter alíquotas fixas no código. Todas as alíquotas, CFOP, CST/CSOSN, MVA, reduções, benefícios e exceções devem vir do banco de dados.

## RPC obrigatória

A API espera que o Supabase exponha a função:

```sql
tax_engine_get_fiscal_context(
  p_tenant_id text,
  p_document_id text,
  p_mode text
) returns jsonb
```

Essa função deve retornar um JSON no formato `FiscalContext`.

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
tax_rules
tax_rule_conditions
tax_rule_outputs
tax_rates
product_tax_settings
operation_tax_settings
company_tax_settings
fiscal_exceptions
fiscal_benefits
```

## tax_rules

Tabela central de regras mutáveis.

```text
id
tenant_id
name
priority
active
valid_from
valid_until
source
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

Saída fiscal da regra. Aqui ficam as alíquotas e códigos mutáveis.

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
    "uf": "SP",
    "kind": "pj",
    "document": "00000000000191",
    "isIcmsContributor": true,
    "isFinalConsumer": false
  },
  "operation": {
    "type": "venda_mercadoria",
    "isInterstate": false,
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
      "id": "rule_1",
      "tenantId": "tenant_lab",
      "name": "Regra cadastrada no banco",
      "priority": 500,
      "active": true,
      "source": "tenant",
      "legalReference": "Referência legal cadastrada",
      "conditions": {
        "taxRegime": ["lucro_presumido"],
        "ufOrigin": ["SP"],
        "ufDestination": ["SP"],
        "operationType": ["venda_mercadoria"],
        "ncm": ["85044090"],
        "interstate": false
      },
      "output": {
        "cfop": "5102",
        "icms": { "cst": "00", "aliquota": "18.00" },
        "ipi": { "enabled": true, "cst": "50", "aliquota": "5.00" },
        "pis": { "enabled": true, "cst": "01", "aliquota": "0.65" },
        "cofins": { "enabled": true, "cst": "01", "aliquota": "3.00" }
      }
    }
  ],
  "exceptions": []
}
```

## Regra de ouro

O código calcula. O banco decide os parâmetros.

```text
Tax Engine:
  resolve regra
  calcula base
  aplica alíquota recebida
  totaliza
  gera snapshot

Supabase:
  guarda alíquotas
  guarda CFOP/CST/CSOSN
  guarda MVA
  guarda benefícios
  guarda exceções
  guarda vigências
```
