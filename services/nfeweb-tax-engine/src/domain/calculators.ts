import Decimal from 'decimal.js';
import { D, money, percentOf } from './decimal.js';
import type { CalculatedPercentTax, DifalOutput, IcmsOutput, IcmsStOutput, ItemBaseValues, ItemTaxValues, PercentTaxOutput, TaxRuleOutput } from './types.js';

export function calculateItemBase(input: {
  quantity: string;
  unitPrice: string;
  freightValue?: string;
  insuranceValue?: string;
  discountValue?: string;
  otherValue?: string;
  iiValue?: string;
  ipiDevolValue?: string;
}): ItemBaseValues {
  const productValue = D(input.quantity).mul(D(input.unitPrice));
  const freightValue = D(input.freightValue);
  const insuranceValue = D(input.insuranceValue);
  const discountValue = D(input.discountValue);
  const otherValue = D(input.otherValue);
  const operationValue = productValue.plus(freightValue).plus(insuranceValue).plus(otherValue).minus(discountValue);

  return {
    productValue: money(productValue),
    operationValue: money(operationValue),
    discountValue: money(discountValue),
    ...( {
      freightValue: money(freightValue),
      insuranceValue: money(insuranceValue),
      otherValue: money(otherValue),
      iiValue: money(D(input.iiValue)),
      ipiDevolValue: money(D(input.ipiDevolValue))
    } as Record<string, string> )
  } as ItemBaseValues;
}

export function calculateTaxes(base: ItemBaseValues, output: TaxRuleOutput): ItemTaxValues {
  const operationBase = D(base.operationValue);
  const taxes: ItemTaxValues = {};
  const icms = output.icms as (IcmsOutput & { manualBase?: string }) | undefined;
  const ipi = output.ipi as (PercentTaxOutput & { cst?: string; manualBase?: string }) | undefined;
  const pis = output.pis as (PercentTaxOutput & { cst?: string; manualBase?: string }) | undefined;
  const cofins = output.cofins as (PercentTaxOutput & { cst?: string; manualBase?: string }) | undefined;
  const difal = output.difal as (DifalOutput & { manualBase?: string }) | undefined;
  const icmsSt = output.icmsSt as (IcmsStOutput & { manualBase?: string }) | undefined;

  if (icms) taxes.icms = calculateIcms(resolveTaxBase(operationBase, icms.manualBase), icms);
  if (ipi?.enabled !== false && ipi?.aliquota) taxes.ipi = { ...calculatePercentTax(resolveTaxBase(operationBase, ipi.manualBase), ipi), cst: ipi.cst };
  if (pis?.enabled !== false && pis?.aliquota) taxes.pis = { ...calculatePercentTax(resolveTaxBase(operationBase, pis.manualBase), pis), cst: pis.cst };
  if (cofins?.enabled !== false && cofins?.aliquota) taxes.cofins = { ...calculatePercentTax(resolveTaxBase(operationBase, cofins.manualBase), cofins), cst: cofins.cst };
  if (difal?.enabled) taxes.difal = calculateDifal(resolveTaxBase(operationBase, difal.manualBase), difal);
  if (icmsSt?.enabled) taxes.icmsSt = calculateIcmsSt(resolveTaxBase(operationBase, icmsSt.manualBase), icmsSt, taxes.icms?.valor);

  return taxes;
}

export function calculateIcms(base: Decimal, icms: IcmsOutput): CalculatedPercentTax & { cst?: string; csosn?: string; valorDesonerado?: string; valorFcp?: string } {
  const icmsExtended = icms as IcmsOutput & { fcpAliquota?: string };
  const reducedBase = applyReduction(base, icms.reducaoBc);
  const aliquota = icms.aliquota ?? '0';
  const valor = percentOf(reducedBase, aliquota);
  return {
    cst: icms.cst,
    csosn: icms.csosn,
    base: money(reducedBase),
    aliquota,
    valor: money(valor),
    valorDesonerado: icms.desoneracao?.aliquota ? money(percentOf(reducedBase, icms.desoneracao.aliquota)) : '0.00',
    valorFcp: icmsExtended.fcpAliquota ? money(percentOf(reducedBase, icmsExtended.fcpAliquota)) : '0.00'
  };
}

export function calculatePercentTax(base: Decimal, tax: PercentTaxOutput): CalculatedPercentTax {
  const reducedBase = applyReduction(base, tax.reducaoBc);
  const aliquota = tax.aliquota ?? '0';
  return {
    base: money(reducedBase),
    aliquota,
    valor: money(percentOf(reducedBase, aliquota))
  };
}

export function calculateDifal(base: Decimal, difal: DifalOutput): { base: string; valorOrigem?: string; valorDestino: string; valorFcp: string } {
  const aliquotaInterna = D(difal.aliquotaInternaDestino);
  const aliquotaInterestadual = D(difal.aliquotaInterestadual);
  const diferencial = Decimal.max(aliquotaInterna.minus(aliquotaInterestadual), new Decimal(0));
  const valorDestino = percentOf(base, diferencial);
  const valorFcp = percentOf(base, difal.fcpAliquota ?? '0');

  return {
    base: money(base),
    valorOrigem: '0.00',
    valorDestino: money(valorDestino),
    valorFcp: money(valorFcp)
  };
}

export function calculateIcmsSt(base: Decimal, st: IcmsStOutput, icmsProprioValor = '0'): { base: string; valor: string; mvaAplicada?: string; valorFcpSt?: string } {
  const stExtended = st as IcmsStOutput & { fcpAliquota?: string };
  const mva = D(st.mvaAjustada ?? st.mva ?? '0');
  const baseComMva = base.mul(new Decimal(1).plus(mva.div(100)));
  const reducedBase = applyReduction(baseComMva, st.reducaoBcSt);
  const valorCheio = percentOf(reducedBase, st.aliquotaInternaDestino ?? '0');
  const valorSt = Decimal.max(valorCheio.minus(D(icmsProprioValor)), new Decimal(0));

  return {
    base: money(reducedBase),
    valor: money(valorSt),
    mvaAplicada: st.mvaAjustada ?? st.mva,
    valorFcpSt: stExtended.fcpAliquota ? money(percentOf(reducedBase, stExtended.fcpAliquota)) : '0.00'
  };
}

function applyReduction(base: Decimal, reducaoBc?: string): Decimal {
  if (!reducaoBc) return base;
  return base.mul(new Decimal(1).minus(D(reducaoBc).div(100)));
}

function resolveTaxBase(defaultBase: Decimal, manualBase?: string): Decimal {
  return manualBase ? D(manualBase) : defaultBase;
}
