import type { AcbrFiscalDraft } from './acbrTypes.js';
import type { TaxEngineCalculatedItem, TaxEngineCalculationResult } from './resultTypes.js';

export function buildAcbrFiscalDraft(result: Omit<TaxEngineCalculationResult, 'acbrDraft'>): AcbrFiscalDraft {
  return {
    purpose: 'acbr_nfe_draft',
    version: '0.1.0',
    documentId: result.documentId,
    tenantId: result.tenantId,
    emitterId: result.emitterId,
    status: 'calculated',
    generatedBy: 'nfeweb-tax-engine',
    generatedAt: result.calculatedAt,
    items: result.items.map(mapItem),
    totals: result.nfeTotals.ICMSTot as unknown as Record<string, string>,
    warnings: result.warnings
  };
}

function mapItem(item: TaxEngineCalculatedItem, index: number) {
  return {
    itemId: item.itemId,
    productId: item.productId,
    itemNumber: index + 1,
    cfop: item.cfop,
    taxes: {
      icms: item.nfe.imposto.ICMS,
      ipi: item.nfe.imposto.IPI,
      pis: item.nfe.imposto.PIS,
      cofins: item.nfe.imposto.COFINS,
      icmsUfDest: item.nfe.imposto.ICMSUFDest
    }
  };
}
