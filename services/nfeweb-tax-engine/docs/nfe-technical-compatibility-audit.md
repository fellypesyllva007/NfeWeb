# Auditoria de compatibilidade técnica NF-e — Tax Engine

Data: 2026-05-20
Branch: `feat/tax-engine-api`
Serviço: `services/nfeweb-tax-engine`

## Conclusão

A Tax Engine atual ainda não deve ser considerada compatível como motor final de cálculo NF-e.

Ela está correta como arquitetura inicial de cálculo parametrizável, mas os cálculos implementados hoje são fórmulas simplificadas. Antes da emissão real, o motor precisa produzir bases, valores e totalizadores compatíveis com os grupos e tags do leiaute NF-e e com as regras de validação da SEFAZ.

## Ponto positivo já resolvido

A Tax Engine foi ajustada para não guardar alíquotas no código.

Todos os parâmetros mutáveis devem vir do Supabase/Postgres:

```text
ICMS
IPI
PIS
COFINS
DIFAL
FCP
IVA
MVA
MVA ajustada
redução de base
UF origem
UF destino
NCM
CEST
produto
CFOP
CST
CSOSN
benefícios fiscais
exceções fiscais
vigência das regras
```

## Compatibilidade atual por imposto

| Área | Estado atual | Compatibilidade final |
|---|---|---|
| Base do item | `qtd * unitário + frete + seguro + outros - desconto` | Parcial |
| ICMS próprio | percentual simples sobre base reduzida | Parcial |
| ICMS-ST | base com MVA/MVA ajustada menos ICMS próprio | Parcial |
| IPI | percentual simples | Parcial |
| PIS | percentual simples | Parcial |
| COFINS | percentual simples | Parcial |
| DIFAL | diferencial simples + FCP | Parcial |
| Totalizadores NF-e | total simplificado | Não suficiente |
| Tags NF-e/ACBr | ainda não há mapeamento formal para grupos/tags | Não suficiente |

## Principais lacunas técnicas

### 1. Base de cálculo não pode ser única para todos os impostos

Hoje a Tax Engine calcula uma `operationValue` e usa essa base para ICMS, IPI, PIS, COFINS, DIFAL e ICMS-ST.

Isso precisa evoluir para bases específicas:

```text
base_icms
base_icms_st
base_ipi
base_pis
base_cofins
base_difal
base_fcp
```

Cada base deve ser resolvida por regra/tabela, porque pode variar por operação, CST/CSOSN, UF, produto, benefício, frete, seguro, desconto, outras despesas, IPI incluso/excluso etc.

### 2. Totalizadores NF-e ainda estão simplificados

Hoje o total da nota é calculado de forma reduzida:

```text
totalNfe = totalOperacao + totalIpi + totalIcmsSt
```

Isso não é suficiente para NF-e.

A Tax Engine precisa gerar explicitamente os campos do grupo `ICMSTot`, por exemplo:

```text
vBC
vICMS
vICMSDeson
vFCPUFDest
vICMSUFDest
vICMSUFRemet
vFCP
vBCST
vST
vFCPST
vFCPSTRet
vProd
vFrete
vSeg
vDesc
vII
vIPI
vIPIDevol
vPIS
vCOFINS
vOutro
vNF
```

### 3. ICMS precisa ser calculado por CST/CSOSN

O cálculo atual cobre apenas percentual simples.

É necessário separar estratégias por grupos fiscais:

```text
ICMS00
ICMS10
ICMS20
ICMS30
ICMS40/41/50
ICMS51
ICMS60
ICMS70
ICMS90
ICMSSN101
ICMSSN102/103
ICMSSN201
ICMSSN202/203
ICMSSN500
ICMSSN900
```

Cada grupo exige campos e regras diferentes.

### 4. ICMS-ST/MVA precisa de regras por UF/NCM/CEST/produto

A fórmula atual aceita MVA ou MVA ajustada, mas ainda não resolve todos os componentes necessários.

A regra precisa vir das tabelas:

```text
tax_mva_iva_rules
tax_rate_uf_matrix
tax_rate_ncm
tax_rate_product
tax_reduction_rules
```

E precisa considerar:

```text
UF origem
UF destino
alíquota interna destino
alíquota interestadual
MVA original
MVA ajustada
redução de BC-ST
CEST
NCM
produto
convênio/protocolo
vigência
```

### 5. DIFAL precisa suportar modalidades diferentes

Hoje o DIFAL é:

```text
base * max(alíquota interna destino - alíquota interestadual, 0)
```

Isso é útil para laboratório, mas ainda não é suficiente.

Precisa suportar:

```text
base simples
base por dentro
FCP
campos de partilha quando aplicáveis
consumidor final contribuinte/não contribuinte
UF destino
regras por vigência
```

### 6. IPI precisa suportar CST e formas de cálculo

Hoje o IPI é percentual simples.

Precisa evoluir para:

```text
IPI por alíquota ad valorem
IPI por quantidade/unidade, quando aplicável
CST IPI
enquadramento legal
classe de enquadramento
código de enquadramento
produto/NCM/TIPI
```

### 7. PIS/COFINS precisam suportar CST e modalidades

Hoje PIS/COFINS são percentuais simples.

Precisa evoluir para:

```text
alíquota básica
alíquota zero
monofásico
substituição tributária
suspensão
isenção
não tributado
cálculo por quantidade, quando aplicável
regime cumulativo/não cumulativo
CST específico
```

### 8. Snapshot precisa guardar tags fiscais e regra aplicada

Cada item deve guardar:

```text
rule_id_applied
exception_ids_applied
tax_parameters_snapshot
nfe_tag_snapshot
calculation_formula_version
legal_reference
```

A nota precisa poder ser auditada mesmo se a regra mudar depois.

## Mudança recomendada no modelo interno

Criar uma camada de saída específica para NF-e:

```text
NfeItemTaxSnapshot
NfeTotalSnapshot
```

Ela deve mapear o resultado da Tax Engine para os grupos/tags que a API fiscal/ACBrLib vai usar.

Exemplo conceitual:

```ts
interface NfeItemTaxSnapshot {
  imposto: {
    ICMS: Record<string, string>;
    IPI?: Record<string, string>;
    PIS?: Record<string, string>;
    COFINS?: Record<string, string>;
  };
}

interface NfeTotalSnapshot {
  ICMSTot: {
    vBC: string;
    vICMS: string;
    vICMSDeson: string;
    vFCP: string;
    vBCST: string;
    vST: string;
    vFCPST: string;
    vProd: string;
    vFrete: string;
    vSeg: string;
    vDesc: string;
    vII: string;
    vIPI: string;
    vIPIDevol: string;
    vPIS: string;
    vCOFINS: string;
    vOutro: string;
    vNF: string;
  };
}
```

## Próximos ajustes obrigatórios

1. Criar totalizador NF-e explícito `ICMSTot`.
2. Separar bases por imposto.
3. Criar calculadoras por grupo CST/CSOSN de ICMS.
4. Criar calculadoras por CST de IPI.
5. Criar calculadoras por CST de PIS/COFINS.
6. Criar estratégia de DIFAL por modalidade.
7. Gerar snapshot com nomes de tags NF-e.
8. Fazer a API fiscal Python consumir esse snapshot para montar INI/XML.
9. Rodar validação via ACBrLib e comparar rejeições com regras de validação SEFAZ.

## Parecer final

A Tax Engine atual é uma boa fundação técnica, mas ainda não está compatível como motor fiscal final de NF-e.

Ela está pronta para evoluir porque:

- usa Decimal;
- não depende de alíquotas hardcoded;
- carrega regras por banco;
- suporta prioridade de regra;
- suporta exceções;
- gera snapshot;
- separa cálculo da ACBrLib.

Mas ainda precisa de uma camada específica de compatibilidade NF-e para totalizadores, grupos fiscais e tags que serão enviados para a ACBrLib/SEFAZ.
