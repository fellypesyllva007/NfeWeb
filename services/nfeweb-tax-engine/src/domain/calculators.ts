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
    } as Partial<ItemBaseValues> )
  };
}

export function calculateTaxes(base: ItemBaseValues, output: TaxRuleOutput): ItemTaxValues {
  const operationBase = D(base.operationValue);
  const taxes: ItemTaxValues = {};

  if (output.icms) taxes.icms = calculateIcms(resolveTaxBase(operationBase, output.icms.manualBase), output.icms);
  if (output.ipi?.enabled !== false && output.ipi?.aliquota) taxes.ipi = { ...calculatePercentTax(resolveTaxBase(operationBase, output.ipi.manualBase), output.ipi), cst: output.ipi.cst };
  if (output.pis?.enabled !== false && output.pis?.aliquota) taxes.pis = { ...calculatePercentTax(resolveTaxBase(operationBase, output.pis.manualBase), output.pis), cst: output.pis.cst };
  if (output.cofins?.enabled !== false && output.cofins?.aliquota) taxes.cofins = { ...calculatePercentTax(resolveTaxBase(operationBase, output.cofins.manualBase), output.cofins), cst: output.cofins.cst };
  if (output.difal?.enabled) taxes.difal = calculateDifal(resolveTaxBase(operationBase, output.difal.manualBase), output.difal);
  if (output.icmsSt?.enabled) taxes.icmsSt = calculateIcmsSt(resolveTaxBase(operationBase, output.icmsSt.manualBase), output.icmsSt, taxes.icms?.valor);

  return taxes;
}

export function calculateIcms(base: Decimal, icms: IcmsOutput): CalculatedPercentTax & { cst?: string; csosn?: string; valorDesonerado?: string; valorFcp?: string } {
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
    valorFcp: icms.fcpAliquota ? money(percentOf(reducedBase, icms.fcpAliquota)) : '0.00'
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
  const mva = D(st.mvaAjustada ?? st.mva ?? '0');
  const baseComMva = base.mul(new Decimal(1).plus(mva.div(100)));
  const reducedBase = applyReduction(baseComMva, st.reducaoBcSt);
  const valorCheio = percentOf(reducedBase, st.aliquotaInternaDestino ?? '0');
  const valorSt = Decimal.max(valorCheio.minus(D(icmsProprioValor)), new Decimal(0));

  return {
    base: money(reducedBase),
    valor: money(valorSt),
    mvaAplicada: st.mvaAjustada ?? st.mva,
    valorFcpSt: st.fcpAliquota ? money(percentOf(reducedBase, st.fcpAliquota)) : '0.00'
  };
}

function applyReduction(base: Decimal, reducaoBc?: string): Decimal {
  if (!reducaoBc) return base;
  return base.mul(new Decimal(1).minus(D(reducaoBc).div(100)));
}

function resolveTaxBase(defaultBase: Decimal, manualBase?: string): Decimal {
  return manualBase ? D(manualBase) : defaultBase;
}
