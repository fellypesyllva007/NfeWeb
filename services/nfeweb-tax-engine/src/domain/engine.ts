import { nanoid } from 'nanoid';
import { D, money } from './decimal.js';
import { calculateItemBase, calculateTaxes } from './calculators.js';
import { resolveRuleForItem } from './ruleResolver.js';
import type { CalculatedTaxDocument, CalculatedTaxItem, FiscalContext, TaxTotals } from './types.js';

export function calculateDocument(context: FiscalContext): CalculatedTaxDocument {
  const items: CalculatedTaxItem[] = context.items.map((item) => {
    const resolved = resolveRuleForItem(context, item);
    const base = calculateItemBase(item);
    const taxes = calculateTaxes(base, resolved.output);

    const snapshot = {
      input: item,
      rule: resolved.rule,
      exceptions: resolved.exceptions,
      output: resolved.output,
      mode: context.mode,
      calculatedAt: new Date().toISOString()
    };

    return {
      itemId: item.itemId,
      productId: item.productId,
      cfop: resolved.output.cfop ?? item.cfop,
      ruleIdApplied: resolved.rule?.id,
      exceptionIdsApplied: resolved.exceptions.map((exception) => exception.id),
      base,
      taxes,
      snapshot,
      warnings: resolved.warnings
    };
  });

  const warnings = items.flatMap((item) => item.warnings);
  const errors: string[] = [];

  for (const item of items) {
    if (!item.cfop) warnings.push(`Item ${item.itemId} sem CFOP resolvido.`);
    if (!item.taxes.icms?.cst && !item.taxes.icms?.csosn) warnings.push(`Item ${item.itemId} sem CST/CSOSN de ICMS resolvido.`);
  }

  return {
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok',
    calculationId: nanoid(),
    tenantId: context.tenantId,
    documentId: context.documentId,
    mode: context.mode,
    calculatedAt: new Date().toISOString(),
    totals: calculateTotals(items),
    items,
    warnings,
    errors
  };
}

function calculateTotals(items: CalculatedTaxItem[]): TaxTotals {
  const sum = (selector: (item: CalculatedTaxItem) => string | undefined) =>
    items.reduce((acc, item) => acc.plus(D(selector(item))), D(0));

  const totalProdutos = sum((item) => item.base.productValue);
  const totalDescontos = sum((item) => item.base.discountValue);
  const totalOperacao = sum((item) => item.base.operationValue);
  const totalIcms = sum((item) => item.taxes.icms?.valor);
  const totalIcmsSt = sum((item) => item.taxes.icmsSt?.valor);
  const totalIpi = sum((item) => item.taxes.ipi?.valor);
  const totalPis = sum((item) => item.taxes.pis?.valor);
  const totalCofins = sum((item) => item.taxes.cofins?.valor);
  const totalDifalDestino = sum((item) => item.taxes.difal?.valorDestino);
  const totalFcp = sum((item) => item.taxes.difal?.valorFcp);
  const totalNfe = totalOperacao.plus(totalIpi).plus(totalIcmsSt);

  return {
    totalProdutos: money(totalProdutos),
    totalDescontos: money(totalDescontos),
    totalOperacao: money(totalOperacao),
    totalIcms: money(totalIcms),
    totalIcmsSt: money(totalIcmsSt),
    totalIpi: money(totalIpi),
    totalPis: money(totalPis),
    totalCofins: money(totalCofins),
    totalDifalDestino: money(totalDifalDestino),
    totalFcp: money(totalFcp),
    totalNfe: money(totalNfe)
  };
}
