import type { FiscalContext, FiscalException, FiscalItemInput, TaxRule, TaxRuleOutput } from './types.js';

export interface ResolvedRule {
  rule?: TaxRule;
  exceptions: FiscalException[];
  output: TaxRuleOutput;
  warnings: string[];
}

export function resolveRuleForItem(context: FiscalContext, item: FiscalItemInput): ResolvedRule {
  const candidates = context.rules
    .filter((rule) => rule.active)
    .filter((rule) => isWithinValidity(rule.validFrom, rule.validUntil, context.issuedAt))
    .filter((rule) => matchesRule(context, item, rule))
    .sort((a, b) => b.priority - a.priority);

  const selected = candidates[0];
  const warnings: string[] = [];

  if (!selected) {
    warnings.push(`Nenhuma regra tributária encontrada para item ${item.itemId} / NCM ${item.ncm}.`);
  }

  const exceptions = (context.exceptions ?? [])
    .filter((exception) => exception.active)
    .filter((exception) => exception.tenantId === context.tenantId)
    .filter((exception) => !exception.emitterId || exception.emitterId === context.emitterId)
    .filter((exception) => isWithinValidity(exception.validFrom, exception.validUntil, context.issuedAt))
    .filter((exception) => matchesException(item, exception));

  let output: TaxRuleOutput = selected?.output ?? {};
  for (const exception of exceptions) {
    output = mergeOutput(output, exception.outputOverride);
  }

  if (item.manualOverrides) {
    output = mergeOutput(output, item.manualOverrides);
    warnings.push(`Item ${item.itemId} possui override manual: ${item.manualOverrides.reason ?? 'sem motivo informado'}.`);
  }

  return { rule: selected, exceptions, output, warnings };
}

function matchesRule(context: FiscalContext, item: FiscalItemInput, rule: TaxRule): boolean {
  const c = rule.conditions;
  return matchesList(c.taxRegime, context.emitter.taxRegime)
    && matchesList(c.ufOrigin, context.emitter.uf)
    && matchesList(c.ufDestination, context.customer.uf)
    && matchesList(c.operationType, context.operation.type)
    && matchesList(c.customerKind, context.customer.kind)
    && matchesBoolean(c.icmsContributor, context.customer.isIcmsContributor)
    && matchesBoolean(c.finalConsumer, context.customer.isFinalConsumer)
    && matchesBoolean(c.interstate, context.operation.isInterstate)
    && matchesList(c.cest, item.cest)
    && matchesList(c.productId, item.productId)
    && matchesNcm(c.ncm, c.ncmPrefix, item.ncm);
}

function matchesException(item: FiscalItemInput, exception: FiscalException): boolean {
  if (exception.productId && exception.productId !== item.productId) return false;
  if (exception.ncm && exception.ncm !== item.ncm) return false;
  return true;
}

function matchesList<T extends string>(allowed: T[] | undefined, value: T | string | undefined): boolean {
  if (!allowed || allowed.length === 0) return true;
  if (!value) return false;
  return allowed.includes(value as T);
}

function matchesBoolean(expected: boolean | undefined, value: boolean): boolean {
  if (expected === undefined) return true;
  return expected === value;
}

function matchesNcm(exact: string[] | undefined, prefixes: string[] | undefined, ncm: string): boolean {
  if ((!exact || exact.length === 0) && (!prefixes || prefixes.length === 0)) return true;
  if (exact?.includes(ncm)) return true;
  return Boolean(prefixes?.some((prefix) => ncm.startsWith(prefix)));
}

function isWithinValidity(validFrom?: string, validUntil?: string, issuedAt?: string): boolean {
  const reference = issuedAt ? new Date(issuedAt) : new Date();
  if (validFrom && reference < new Date(validFrom)) return false;
  if (validUntil && reference > new Date(validUntil)) return false;
  return true;
}

function mergeOutput(base: TaxRuleOutput, override: Partial<TaxRuleOutput>): TaxRuleOutput {
  return {
    ...base,
    ...override,
    icms: { ...base.icms, ...override.icms },
    ipi: { ...base.ipi, ...override.ipi },
    pis: { ...base.pis, ...override.pis },
    cofins: { ...base.cofins, ...override.cofins },
    difal: { ...base.difal, ...override.difal },
    icmsSt: { ...base.icmsSt, ...override.icmsSt },
    notes: [...(base.notes ?? []), ...(override.notes ?? [])]
  };
}
