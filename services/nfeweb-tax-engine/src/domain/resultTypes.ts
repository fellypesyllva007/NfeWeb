import type { AcbrFiscalDraft } from './acbrTypes.js';
import type { NfeItemTaxSnapshot, NfeTotalSnapshot } from './nfeTypes.js';
import type { CalculatedTaxDocument, CalculatedTaxItem } from './types.js';

export interface TaxEngineCalculatedItem extends CalculatedTaxItem {
  nfe: NfeItemTaxSnapshot;
}

export interface TaxEngineCalculationResult extends Omit<CalculatedTaxDocument, 'items'> {
  emitterId: string;
  items: TaxEngineCalculatedItem[];
  nfeTotals: NfeTotalSnapshot;
  acbrDraft: AcbrFiscalDraft;
}
