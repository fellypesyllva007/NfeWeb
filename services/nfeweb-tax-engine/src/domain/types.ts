export type BrazilianUf =
  | 'AC' | 'AL' | 'AP' | 'AM' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO' | 'MA' | 'MT' | 'MS' | 'MG'
  | 'PA' | 'PB' | 'PR' | 'PE' | 'PI' | 'RJ' | 'RN' | 'RS' | 'RO' | 'RR' | 'SC' | 'SP' | 'SE' | 'TO';

export type TaxRegime = 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'mei' | 'outro';
export type CustomerKind = 'pf' | 'pj';
export type OperationType =
  | 'venda_mercadoria'
  | 'venda_consumidor_final'
  | 'devolucao'
  | 'remessa'
  | 'transferencia'
  | 'bonificacao'
  | 'industrializacao'
  | 'consignacao'
  | 'importacao'
  | 'exportacao'
  | 'outra';

export type TaxMode = 'preview' | 'official';

export interface FiscalContext {
  tenantId: string;
  emitterId: string;
  documentId?: string;
  issuedAt?: string;
  mode: TaxMode;
  emitter: EmitterFiscalProfile;
  customer: CustomerFiscalProfile;
  operation: OperationFiscalProfile;
  items: FiscalItemInput[];
  rules: TaxRule[];
  exceptions?: FiscalException[];
}

export interface EmitterFiscalProfile {
  uf: BrazilianUf;
  cnpj: string;
  taxRegime: TaxRegime;
  crt?: '1' | '2' | '3' | '4';
  inscricaoEstadual?: string;
  cnae?: string;
  specialRegimeRefs?: string[];
}

export interface CustomerFiscalProfile {
  uf: BrazilianUf;
  kind: CustomerKind;
  document: string;
  isIcmsContributor: boolean;
  isFinalConsumer: boolean;
  hasSuframa?: boolean;
}

export interface OperationFiscalProfile {
  type: OperationType;
  description?: string;
  cfopHint?: string;
  naturezaOperacao?: string;
  isInterstate: boolean;
  isInPerson?: boolean;
}

export interface FiscalItemInput {
  itemId: string;
  productId: string;
  description: string;
  ncm: string;
  cest?: string;
  cfop?: string;
  originCode?: string;
  quantity: string;
  unitPrice: string;
  freightValue?: string;
  insuranceValue?: string;
  discountValue?: string;
  otherValue?: string;
  manualOverrides?: Partial<TaxRuleOutput> & { reason?: string; authorizedBy?: string };
}

export interface TaxRule {
  id: string;
  tenantId?: string;
  name: string;
  priority: number;
  active: boolean;
  validFrom?: string;
  validUntil?: string;
  source?: 'tenant' | 'system' | 'uf' | 'product' | 'manual' | 'legal_exception';
  legalReference?: string;
  conditions: TaxRuleCondition;
  output: TaxRuleOutput;
}

export interface TaxRuleCondition {
  taxRegime?: TaxRegime[];
  ufOrigin?: BrazilianUf[];
  ufDestination?: BrazilianUf[];
  operationType?: OperationType[];
  ncm?: string[];
  ncmPrefix?: string[];
  cest?: string[];
  productId?: string[];
  customerKind?: CustomerKind[];
  icmsContributor?: boolean;
  finalConsumer?: boolean;
  interstate?: boolean;
}

export interface TaxRuleOutput {
  cfop?: string;
  icms?: IcmsOutput;
  ipi?: PercentTaxOutput & { cst?: string; enquadramentoLegal?: string };
  pis?: PercentTaxOutput & { cst?: string };
  cofins?: PercentTaxOutput & { cst?: string };
  difal?: DifalOutput;
  icmsSt?: IcmsStOutput;
  notes?: string[];
}

export interface IcmsOutput {
  cst?: string;
  csosn?: string;
  aliquota?: string;
  reducaoBc?: string;
  modBc?: string;
  desoneracao?: PercentTaxOutput;
}

export interface PercentTaxOutput {
  enabled?: boolean;
  aliquota?: string;
  reducaoBc?: string;
  baseMode?: 'valor_item' | 'valor_produtos' | 'valor_operacao' | 'manual';
}

export interface DifalOutput {
  enabled?: boolean;
  aliquotaInternaDestino?: string;
  aliquotaInterestadual?: string;
  fcpAliquota?: string;
  baseMode?: 'por_dentro' | 'simples' | 'manual';
}

export interface IcmsStOutput {
  enabled?: boolean;
  mva?: string;
  mvaAjustada?: string;
  aliquotaInternaDestino?: string;
  reducaoBcSt?: string;
}

export interface FiscalException {
  id: string;
  tenantId: string;
  emitterId?: string;
  productId?: string;
  ncm?: string;
  taxType: 'icms' | 'icms_st' | 'ipi' | 'pis' | 'cofins' | 'difal' | 'all';
  description: string;
  legalReference: string;
  validFrom?: string;
  validUntil?: string;
  outputOverride: Partial<TaxRuleOutput>;
  active: boolean;
}

export interface CalculatedTaxDocument {
  status: 'ok' | 'warning' | 'error';
  calculationId: string;
  tenantId: string;
  documentId?: string;
  mode: TaxMode;
  calculatedAt: string;
  totals: TaxTotals;
  items: CalculatedTaxItem[];
  warnings: string[];
  errors: string[];
}

export interface CalculatedTaxItem {
  itemId: string;
  productId: string;
  cfop?: string;
  ruleIdApplied?: string;
  exceptionIdsApplied: string[];
  base: ItemBaseValues;
  taxes: ItemTaxValues;
  snapshot: Record<string, unknown>;
  warnings: string[];
}

export interface ItemBaseValues {
  productValue: string;
  operationValue: string;
  discountValue: string;
}

export interface ItemTaxValues {
  icms?: CalculatedPercentTax & { cst?: string; csosn?: string };
  ipi?: CalculatedPercentTax & { cst?: string };
  pis?: CalculatedPercentTax & { cst?: string };
  cofins?: CalculatedPercentTax & { cst?: string };
  difal?: { base: string; valorOrigem?: string; valorDestino: string; valorFcp: string };
  icmsSt?: { base: string; valor: string; mvaAplicada?: string };
}

export interface CalculatedPercentTax {
  base: string;
  aliquota: string;
  valor: string;
}

export interface TaxTotals {
  totalProdutos: string;
  totalDescontos: string;
  totalOperacao: string;
  totalIcms: string;
  totalIcmsSt: string;
  totalIpi: string;
  totalPis: string;
  totalCofins: string;
  totalDifalDestino: string;
  totalFcp: string;
  totalNfe: string;
}
