export interface AcbrFiscalDraft {
  purpose: 'acbr_nfe_draft';
  version: '0.1.0';
  documentId?: string;
  tenantId: string;
  emitterId: string;
  status: 'calculated';
  generatedBy: 'nfeweb-tax-engine';
  generatedAt: string;
  items: AcbrFiscalDraftItem[];
  totals: Record<string, string>;
  warnings: string[];
}

export interface AcbrFiscalDraftItem {
  itemId: string;
  productId: string;
  itemNumber: number;
  cfop?: string;
  taxes: {
    icms?: Record<string, string | undefined>;
    ipi?: Record<string, string | undefined>;
    pis?: Record<string, string | undefined>;
    cofins?: Record<string, string | undefined>;
    icmsUfDest?: Record<string, string | undefined>;
  };
}
