import { nanoid } from 'nanoid';
import { D, money } from './decimal.js';
import { calculateItemBase, calculateTaxes } from './calculators.js';
import { resolveRuleForItem } from './ruleResolver.js';
import { buildAcbrFiscalDraft } from './acbrMapper.js';
import { buildNfeItemSnapshot } from './nfeItemMapper.js';
import { buildNfeTotals } from './nfeTotals.js';
import type { CalculatedTaxDocument, CalculatedTaxItem, FiscalContext, TaxTotals } from './types.js';

export function calculateDocument(context: FiscalContext): CalculatedTaxDocument {
  const items: CalculatedTaxItem[] = context.items.map((item) => {
    const resolved = resolveRuleForItem(context, item);
    const base = calculateItemBase(item);
    const taxes = calculateTaxes(base, resolved.output);

    const calculatedItem = {
      itemId: item.itemId,
      productId: item.productId,
      cfop: resolved.output.cfop ?? item.cfop,
      ruleIdApplied: resolved.rule?.id,
      exceptionIdsApplied: resolved.exceptions.map((exception) => exception.id),
      base,
      taxes,
      snapshot: {
        input: item,
        rule: resolved.rule,
        exceptions: resolved.exceptions,
        output: resolved.output,
        mode: context.mode,
        calculatedAt: new Date().toISOString()
      },
      warnings: resolved.warnings
    } as CalculatedTaxItem;

    return {
      ...calculatedItem,
      ...( { nfe: buildNfeItemSnapshot(calculatedItem, item) } as Record<string, unknown> )
    } as CalculatedTaxItem;
  });

  const warnings = items.flatMap((item) => item.warnings);
  const errors: string[] = [];

  for (const item of items) {
    if (!item.cfop) warnings.push(`Item ${item.itemId} sem CFOP resolvido.`);
    if (!item.taxes.icms?.cst && !item.taxes.icms?.csosn) warnings.push(`Item ${item.itemId} sem CST/CSOSN de ICMS resolvido.`);
  }

  const result = {
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok',
    calculationId: nanoid(),
    tenantId: context.tenantId,
    emitterId: context.emitterId,
    documentId: context.documentId,
    mode: context.mode,
    calculatedAt: new Date().toISOString(),
    totals: calculateTotals(items),
    ...( { nfeTotals: buildNfeTotals(items) } as Record<string, unknown> ),
    items,
    warnings,
    errors
  } as CalculatedTaxDocument;

  return {
    ...result,
    ...( { acbrDraft: buildAcbrFiscalDraft(result) } as Record<string, unknown> )
  } as CalculatedTaxDocument;
}

function calculateTotals(items: CalculatedTaxItem[]): TaxTotals {
  const sum = (selector: (item: CalculatedTaxItem) => string | undefined) =>
    items.reduce((acc, item) => acc.plus(D(selector(item))), D(0));

  const totalProdutos = sum((item) => item.base.productValue);
  const totalFrete = sum((item) => (item.base as any).freightValue);
  const totalSeguro = sum((item) => (item.base as any).insuranceValue);
  const totalDescontos = sum((item) => item.base.discountValue);
  const totalOutros = sum((item) => (item.base as any).otherValue);
  const totalOperacao = sum((item) => item.base.operationValue);
  const totalIcmsBase = sum((item) => item.taxes.icms?.base);
  const totalIcms = sum((item) => item.taxes.icms?.valor);
  const totalIcmsDeson = sum((item) => (item.taxes.icms as any)?.valorDesonerado);
  const totalIcmsStBase = sum((item) => item.taxes.icmsSt?.base);
  const totalIcmsSt = sum((item) => item.taxes.icmsSt?.valor);
  const totalIpi = sum((item) => item.taxes.ipi?.valor);
  const totalIpiDevol = sum((item) => (item.base as any).ipiDevolValue);
  const totalPis = sum((item) => item.taxes.pis?.valor);
  const totalCofins = sum((item) => item.taxes.cofins?.valor);
  const totalDifalDestino = sum((item) => item.taxes.difal?.valorDestino);
  const totalDifalOrigem = sum((item) => item.taxes.difal?.valorOrigem);
  const totalFcp = sum((item) => item.taxes.difal?.valorFcp).plus(sum((item) => (item.taxes.icms as any)?.valorFcp));
  const totalFcpSt = sum((item) => (item.taxes.icmsSt as any)?.valorFcpSt);
  const totalIi = sum((item) => (item.base as any).iiValue);
  const totalNfe = totalOperacao.plus(totalIpi).plus(totalIcmsSt).plus(totalIi).minus(totalIpiDevol);

  return {
    totalProdutos: money(totalProdutos),
    ...( {
      totalFrete: money(totalFrete),
      totalSeguro: money(totalSeguro),
      totalOutros: money(totalOutros),
      totalIcmsBase: money(totalIcmsBase),
      totalIcmsDeson: money(totalIcmsDeson),
      totalIcmsStBase: money(totalIcmsStBase),
      totalIpiDevol: money(totalIpiDevol),
      totalDifalOrigem: money(totalDifalOrigem),
      totalFcpSt: money(totalFcpSt),
      totalIi: money(totalIi)
    } as Record<string, string> ),
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
  } as TaxTotals;
}
