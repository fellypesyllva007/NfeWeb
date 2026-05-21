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
}): ItemBaseValues {
  const productValue = D(input.quantity).mul(D(input.unitPrice));
  const discountValue = D(input.discountValue);
  const operationValue = productValue
    .plus(D(input.freightValue))
    .plus(D(input.insuranceValue))
    .plus(D(input.otherValue))
    .minus(discountValue);

  return {
    productValue: money(productValue),
    operationValue: money(operationValue),
    discountValue: money(discountValue)
  };
}

export function calculateTaxes(base: ItemBaseValues, output: TaxRuleOutput): ItemTaxValues {
  const operationBase = D(base.operationValue);
  const taxes: ItemTaxValues = {};

  if (output.icms) taxes.icms = calculateIcms(operationBase, output.icms);
  if (output.ipi?.enabled !== false && output.ipi?.aliquota) taxes.ipi = { ...calculatePercentTax(operationBase, output.ipi), cst: output.ipi.cst };
  if (output.pis?.enabled !== false && output.pis?.aliquota) taxes.pis = { ...calculatePercentTax(operationBase, output.pis), cst: output.pis.cst };
  if (output.cofins?.enabled !== false && output.cofins?.aliquota) taxes.cofins = { ...calculatePercentTax(operationBase, output.cofins), cst: output.cofins.cst };
  if (output.difal?.enabled) taxes.difal = calculateDifal(operationBase, output.difal);
  if (output.icmsSt?.enabled) taxes.icmsSt = calculateIcmsSt(operationBase, output.icmsSt, taxes.icms?.valor);

  return taxes;
}

export function calculateIcms(base: Decimal, icms: IcmsOutput): CalculatedPercentTax & { cst?: string; csosn?: string } {
  const reducedBase = applyReduction(base, icms.reducaoBc);
  const aliquota = icms.aliquota ?? '0';
  return {
    cst: icms.cst,
    csosn: icms.csosn,
    base: money(reducedBase),
    aliquota,
    valor: money(percentOf(reducedBase, aliquota))
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

export function calculateIcmsSt(base: Decimal, st: IcmsStOutput, icmsProprioValor = '0'): { base: string; valor: string; mvaAplicada?: string } {
  const mva = D(st.mvaAjustada ?? st.mva ?? '0');
  const baseComMva = base.mul(new Decimal(1).plus(mva.div(100)));
  const reducedBase = applyReduction(baseComMva, st.reducaoBcSt);
  const valorCheio = percentOf(reducedBase, st.aliquotaInternaDestino ?? '0');
  const valorSt = Decimal.max(valorCheio.minus(D(icmsProprioValor)), new Decimal(0));

  return {
    base: money(reducedBase),
    valor: money(valorSt),
    mvaAplicada: st.mvaAjustada ?? st.mva
  };
}

function applyReduction(base: Decimal, reducaoBc?: string): Decimal {
  if (!reducaoBc) return base;
  return base.mul(new Decimal(1).minus(D(reducaoBc).div(100)));
}
