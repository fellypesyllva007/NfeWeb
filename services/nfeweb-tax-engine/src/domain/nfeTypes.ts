export type NfeIcmsGroupName =
  | `ICMS${string}`
  | `ICMSSN${string}`;

export interface NfeItemTaxSnapshot {
  itemId: string;
  productId: string;
  cfop?: string;
  imposto: {
    ICMS?: Record<string, string | undefined>;
    IPI?: Record<string, string | undefined>;
    PIS?: Record<string, string | undefined>;
    COFINS?: Record<string, string | undefined>;
  };
  nfeTags: {
    icmsGroup?: NfeIcmsGroupName;
    ipiGroup?: 'IPITrib' | 'IPINT';
    pisGroup?: 'PISAliq' | 'PISQtde' | 'PISNT' | 'PISOutr';
    cofinsGroup?: 'COFINSAliq' | 'COFINSQtde' | 'COFINSNT' | 'COFINSOutr';
  };
}

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
