import { z } from 'zod';

const ufSchema = z.enum([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]);

const taxRegimeSchema = z.enum(['simples_nacional', 'lucro_presumido', 'lucro_real', 'mei', 'outro']);
const operationTypeSchema = z.enum([
  'venda_mercadoria',
  'venda_consumidor_final',
  'devolucao',
  'remessa',
  'transferencia',
  'bonificacao',
  'industrializacao',
  'consignacao',
  'importacao',
  'exportacao',
  'outra'
]);

const taxRuleOutputSchema = z.object({
  cfop: z.string().optional(),
  icms: z.object({
    cst: z.string().optional(),
    csosn: z.string().optional(),
    aliquota: z.string().optional(),
    reducaoBc: z.string().optional(),
    modBc: z.string().optional()
  }).optional(),
  ipi: z.object({ enabled: z.boolean().optional(), cst: z.string().optional(), aliquota: z.string().optional(), reducaoBc: z.string().optional(), enquadramentoLegal: z.string().optional() }).optional(),
  pis: z.object({ enabled: z.boolean().optional(), cst: z.string().optional(), aliquota: z.string().optional(), reducaoBc: z.string().optional() }).optional(),
  cofins: z.object({ enabled: z.boolean().optional(), cst: z.string().optional(), aliquota: z.string().optional(), reducaoBc: z.string().optional() }).optional(),
  difal: z.object({ enabled: z.boolean().optional(), aliquotaInternaDestino: z.string().optional(), aliquotaInterestadual: z.string().optional(), fcpAliquota: z.string().optional(), baseMode: z.enum(['por_dentro', 'simples', 'manual']).optional() }).optional(),
  icmsSt: z.object({ enabled: z.boolean().optional(), mva: z.string().optional(), mvaAjustada: z.string().optional(), aliquotaInternaDestino: z.string().optional(), reducaoBcSt: z.string().optional() }).optional(),
  notes: z.array(z.string()).optional()
});

export const fiscalContextSchema = z.object({
  tenantId: z.string().min(1),
  emitterId: z.string().min(1),
  documentId: z.string().optional(),
  issuedAt: z.string().datetime().optional(),
  mode: z.enum(['preview', 'official']).default('preview'),
  emitter: z.object({
    uf: ufSchema,
    cnpj: z.string().min(8),
    taxRegime: taxRegimeSchema,
    crt: z.enum(['1', '2', '3', '4']).optional(),
    inscricaoEstadual: z.string().optional(),
    cnae: z.string().optional(),
    specialRegimeRefs: z.array(z.string()).optional()
  }),
  customer: z.object({
    uf: ufSchema,
    kind: z.enum(['pf', 'pj']),
    document: z.string().min(1),
    isIcmsContributor: z.boolean(),
    isFinalConsumer: z.boolean(),
    hasSuframa: z.boolean().optional()
  }),
  operation: z.object({
    type: operationTypeSchema,
    description: z.string().optional(),
    cfopHint: z.string().optional(),
    naturezaOperacao: z.string().optional(),
    isInterstate: z.boolean(),
    isInPerson: z.boolean().optional()
  }),
  items: z.array(z.object({
    itemId: z.string().min(1),
    productId: z.string().min(1),
    description: z.string().min(1),
    ncm: z.string().min(2),
    cest: z.string().optional(),
    cfop: z.string().optional(),
    originCode: z.string().optional(),
    quantity: z.string(),
    unitPrice: z.string(),
    freightValue: z.string().optional(),
    insuranceValue: z.string().optional(),
    discountValue: z.string().optional(),
    otherValue: z.string().optional(),
    manualOverrides: taxRuleOutputSchema.extend({ reason: z.string().optional(), authorizedBy: z.string().optional() }).partial().optional()
  })).min(1),
  rules: z.array(z.object({
    id: z.string().min(1),
    tenantId: z.string().optional(),
    name: z.string().min(1),
    priority: z.number().int(),
    active: z.boolean(),
    validFrom: z.string().optional(),
    validUntil: z.string().optional(),
    source: z.enum(['tenant', 'system', 'uf', 'product', 'manual', 'legal_exception']).optional(),
    legalReference: z.string().optional(),
    conditions: z.object({
      taxRegime: z.array(taxRegimeSchema).optional(),
      ufOrigin: z.array(ufSchema).optional(),
      ufDestination: z.array(ufSchema).optional(),
      operationType: z.array(operationTypeSchema).optional(),
      ncm: z.array(z.string()).optional(),
      ncmPrefix: z.array(z.string()).optional(),
      cest: z.array(z.string()).optional(),
      productId: z.array(z.string()).optional(),
      customerKind: z.array(z.enum(['pf', 'pj'])).optional(),
      icmsContributor: z.boolean().optional(),
      finalConsumer: z.boolean().optional(),
      interstate: z.boolean().optional()
    }),
    output: taxRuleOutputSchema
  })).default([]),
  exceptions: z.array(z.object({
    id: z.string(),
    tenantId: z.string(),
    emitterId: z.string().optional(),
    productId: z.string().optional(),
    ncm: z.string().optional(),
    taxType: z.enum(['icms', 'icms_st', 'ipi', 'pis', 'cofins', 'difal', 'all']),
    description: z.string(),
    legalReference: z.string(),
    validFrom: z.string().optional(),
    validUntil: z.string().optional(),
    outputOverride: taxRuleOutputSchema.partial(),
    active: z.boolean()
  })).optional()
});
