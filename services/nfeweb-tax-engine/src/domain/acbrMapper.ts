import type { CalculatedTaxDocument, CalculatedTaxItem } from './types.js';
import type { AcbrFiscalDraft } from './acbrTypes.js';

export function buildAcbrFiscalDraft(result: CalculatedTaxDocument): AcbrFiscalDraft {
  return {
    purpose: 'acbr_nfe_draft',
    version: '0.1.0',
    documentId: result.documentId,
    tenantId: result.tenantId,
    emitterId: (result as any).emitterId ?? '',
    status: 'calculated',
    generatedBy: 'nfeweb-tax-engine',
    generatedAt: result.calculatedAt,
    items: result.items.map(mapItem),
    totals: ((result as any).nfeTotals?.ICMSTot ?? result.totals) as Record<string, string>,
    warnings: result.warnings
  };
}

function mapItem(item: CalculatedTaxItem, index: number) {
  const nfe = (item as any).nfe;
  return {
    itemId: item.itemId,
    productId: item.productId,
    itemNumber: index + 1,
    cfop: item.cfop,
    taxes: {
      icms: nfe?.imposto?.ICMS,
      ipi: nfe?.imposto?.IPI,
      pis: nfe?.imposto?.PIS,
      cofins: nfe?.imposto?.COFINS,
      icmsUfDest: nfe?.imposto?.ICMSUFDest
    }
  };
}
