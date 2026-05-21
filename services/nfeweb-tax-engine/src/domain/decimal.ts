import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export function D(value: string | number | Decimal | undefined | null): Decimal {
  if (value === undefined || value === null || value === '') return new Decimal(0);
  return new Decimal(value);
}

export function money(value: Decimal): string {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

export function rate(value: string | number | Decimal | undefined | null): Decimal {
  return D(value).div(100);
}

export function percentOf(base: Decimal, aliquotaPercentual: string | number | Decimal | undefined | null): Decimal {
  return base.mul(rate(aliquotaPercentual));
}

export function maxZero(value: Decimal): Decimal {
  return Decimal.max(value, new Decimal(0));
}
