import type { CalculatedTaxItem, FiscalItemInput, ItemTaxValues } from './types.js';
import type { NfeItemTaxSnapshot } from './nfeTypes.js';

export function buildNfeItemSnapshot(item: CalculatedTaxItem, raw: FiscalItemInput): NfeItemTaxSnapshot {
  const taxes = item.taxes as ItemTaxValues;
  const icmsGroup = resolveIcmsGroup(taxes);
  const ipiGroup = taxes.ipi ? resolveIpiGroup(taxes.ipi.cst) : undefined;
  const pisGroup = taxes.pis ? resolvePisGroup(taxes.pis.cst) : undefined;
  const cofinsGroup = taxes.cofins ? resolveCofinsGroup(taxes.cofins.cst) : undefined;

  return {
    itemId: item.itemId,
    productId: item.productId,
    cfop: item.cfop,
    nfeTags: {
      icmsGroup,
      ipiGroup,
      pisGroup,
      cofinsGroup,
      difalGroup: taxes.difal ? 'ICMSUFDest' : undefined
    },
    imposto: {
      ICMS: taxes.icms ? buildIcmsTags(taxes, raw.originCode) : undefined,
      IPI: taxes.ipi ? buildIpiTags(taxes) : undefined,
      PIS: taxes.pis ? buildPisTags(taxes) : undefined,
      COFINS: taxes.cofins ? buildCofinsTags(taxes) : undefined,
      ICMSUFDest: taxes.difal ? buildDifalTags(taxes) : undefined
    }
  };
}

function resolveIcmsGroup(taxes: ItemTaxValues): `ICMS${string}` | `ICMSSN${string}` | undefined {
  const icms = taxes.icms;
  if (!icms) return undefined;
  if (icms.csosn) return `ICMSSN${icms.csosn}`;
  if (icms.cst) return `ICMS${icms.cst}`;
  return undefined;
}

function buildIcmsTags(taxes: ItemTaxValues, origem?: string): Record<string, string | undefined> {
  const icms = taxes.icms as any;
  const st = taxes.icmsSt as any;
  return {
    orig: origem,
    CST: icms?.cst,
    CSOSN: icms?.csosn,
    modBC: icms?.modBc,
    vBC: icms?.base,
    pICMS: icms?.aliquota,
    vICMS: icms?.valor,
    vICMSDeson: icms?.valorDesonerado,
    vFCP: icms?.valorFcp,
    vBCST: st?.base,
    pMVAST: st?.mvaAplicada,
    vICMSST: st?.valor,
    vFCPST: st?.valorFcpSt
  };
}

function buildIpiTags(taxes: ItemTaxValues): Record<string, string | undefined> {
  const ipi = taxes.ipi;
  return { CST: ipi?.cst, vBC: ipi?.base, pIPI: ipi?.aliquota, vIPI: ipi?.valor };
}

function buildPisTags(taxes: ItemTaxValues): Record<string, string | undefined> {
  const pis = taxes.pis;
  return { CST: pis?.cst, vBC: pis?.base, pPIS: pis?.aliquota, vPIS: pis?.valor };
}

function buildCofinsTags(taxes: ItemTaxValues): Record<string, string | undefined> {
  const cofins = taxes.cofins;
  return { CST: cofins?.cst, vBC: cofins?.base, pCOFINS: cofins?.aliquota, vCOFINS: cofins?.valor };
}

function buildDifalTags(taxes: ItemTaxValues): Record<string, string | undefined> {
  const difal = taxes.difal;
  return {
    vBCUFDest: difal?.base,
    vFCPUFDest: difal?.valorFcp,
    vICMSUFDest: difal?.valorDestino,
    vICMSUFRemet: difal?.valorOrigem
  };
}

function resolveIpiGroup(cst?: string): 'IPITrib' | 'IPINT' {
  return cst && ['00', '49', '50', '99'].includes(cst) ? 'IPITrib' : 'IPINT';
}

function resolvePisGroup(cst?: string): 'PISAliq' | 'PISQtde' | 'PISNT' | 'PISOutr' {
  if (cst && ['01', '02'].includes(cst)) return 'PISAliq';
  if (cst === '03') return 'PISQtde';
  if (cst && ['04', '05', '06', '07', '08', '09'].includes(cst)) return 'PISNT';
  return 'PISOutr';
}

function resolveCofinsGroup(cst?: string): 'COFINSAliq' | 'COFINSQtde' | 'COFINSNT' | 'COFINSOutr' {
  if (cst && ['01', '02'].includes(cst)) return 'COFINSAliq';
  if (cst === '03') return 'COFINSQtde';
  if (cst && ['04', '05', '06', '07', '08', '09'].includes(cst)) return 'COFINSNT';
  return 'COFINSOutr';
}
