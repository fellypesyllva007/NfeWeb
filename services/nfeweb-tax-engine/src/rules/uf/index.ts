import type { BrazilianUf, TaxRule } from '../../domain/types.js';
import { spRules } from './sp.js';

const registry: Partial<Record<BrazilianUf, TaxRule[]>> = {
  SP: spRules
};

export function getUfRules(uf: BrazilianUf): TaxRule[] {
  return registry[uf] ?? [];
}

export function getAllUfRules(): TaxRule[] {
  return Object.values(registry).flat();
}
