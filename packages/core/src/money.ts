import { type Basis, combineBasis } from "./basis.ts";

export type Currency = "EUR" | "USD";

export type Money = {
  readonly amount: number;
  readonly currency: Currency;
  readonly basis: Basis;
  readonly asOf: string;
};

export function money(
  amount: number,
  currency: Currency,
  basis: Basis,
  asOf: string,
): Money {
  if (!Number.isInteger(amount)) {
    throw new Error(`Money.amount must be an integer in minor units, got ${amount}`);
  }
  if (basis !== "billed" && basis !== "estimated") {
    throw new Error(`Money.basis must be "billed" or "estimated", got ${String(basis)}`);
  }
  return { amount, currency, basis, asOf };
}

/**
 * The only aggregation point for monetary values.
 * billed + estimated → estimated, always. No configurable exception.
 */
export function sumMoney(values: readonly Money[]): Money {
  if (values.length === 0) {
    throw new Error("sumMoney requires at least one value");
  }
  const first = values[0]!;
  let amount = 0;
  let basis: Basis = first.basis;
  let asOf = first.asOf;

  for (const v of values) {
    if (v.currency !== first.currency) {
      throw new Error(
        `sumMoney cannot mix currencies (${first.currency} vs ${v.currency})`,
      );
    }
    amount += v.amount;
    basis = combineBasis(basis, v.basis);
    if (v.asOf > asOf) asOf = v.asOf;
  }

  return { amount, currency: first.currency, basis, asOf };
}

export function scaleMoney(m: Money, factor: number): Money {
  return { ...m, amount: Math.round(m.amount * factor) };
}

export function zeroMoney(currency: Currency, basis: Basis, asOf: string): Money {
  return { amount: 0, currency, basis, asOf };
}

export function formatMinor(amount: number, currency: Currency, locale = "en-IE"): string {
  return (amount / 100).toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
