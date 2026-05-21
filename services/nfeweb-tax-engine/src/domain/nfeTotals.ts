import { D, money } from './decimal.js';
import type { CalculatedTaxItem } from './types.js';

export interface NfeIcmsTotSnapshot {
  vBC: string;
  vICMS: string;
  vICMSDeson: string;
  vFCPUFDest: string;
  vICMSUFDest: string;
  vICMSUFRemet: string;
  vFCP: string;
  vBCST: string;
  vST: string;
  vFCPST: string;
  vFCPSTRet: string;
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
}

export interface NfeTotalSnapshot {
  ICMSTot: NfeIcmsTotSnapshot;
}

export function buildNfeTotals(items: CalculatedTaxItem[]): NfeTotalSnapshot {
  const sum = (selector: (item: CalculatedTaxItem) => string | undefined) =>
    items.reduce((acc, item) => acc.plus(D(selector(item))), D(0));

  const vProd = sum((item) => item.base.productValue);
  const vFrete = sum((item) => (item.base as any).freightValue);
  const vSeg = sum((item) => (item.base as any).insuranceValue);
  const vDesc = sum((item) => item.base.discountValue);
  const vOutro = sum((item) => (item.base as any).otherValue);
  const vII = sum((item) => (item.base as any).iiValue);
  const vIPI = sum((item) => item.taxes.ipi?.valor);
  const vIPIDevol = sum((item) => (item.base as any).ipiDevolValue);
  const vST = sum((item) => item.taxes.icmsSt?.valor);
  const vNF = vProd.plus(vST).plus(vFrete).plus(vSeg).plus(vOutro).plus(vII).plus(vIPI).minus(vDesc).minus(vIPIDevol);

  return {
    ICMSTot: {
      vBC: money(sum((item) => item.taxes.icms?.base)),
      vICMS: money(sum((item) => item.taxes.icms?.valor)),
      vICMSDeson: money(sum((item) => (item.taxes.icms as any)?.valorDesonerado)),
      vFCPUFDest: money(sum((item) => item.taxes.difal?.valorFcp)),
      vICMSUFDest: money(sum((item) => item.taxes.difal?.valorDestino)),
      vICMSUFRemet: money(sum((item) => item.taxes.difal?.valorOrigem)),
      vFCP: money(sum((item) => (item.taxes.icms as any)?.valorFcp)),
      vBCST: money(sum((item) => item.taxes.icmsSt?.base)),
      vST: money(vST),
      vFCPST: money(sum((item) => (item.taxes.icmsSt as any)?.valorFcpSt)),
      vFCPSTRet: '0.00',
      vProd: money(vProd),
      vFrete: money(vFrete),
      vSeg: money(vSeg),
      vDesc: money(vDesc),
      vII: money(vII),
      vIPI: money(vIPI),
      vIPIDevol: money(vIPIDevol),
      vPIS: money(sum((item) => item.taxes.pis?.valor)),
      vCOFINS: money(sum((item) => item.taxes.cofins?.valor)),
      vOutro: money(vOutro),
      vNF: money(vNF)
    }
  };
}
