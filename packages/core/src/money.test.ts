import { describe, expect, it } from "vitest";
import { money, scaleMoney, sumMoney } from "./money.ts";

const AS_OF = "2026-08-23";

describe("money()", () => {
  it("rejects non-integer amounts", () => {
    expect(() => money(1.5, "EUR", "billed", AS_OF)).toThrow(/integer/);
  });

  it("rejects invalid basis", () => {
    // @ts-expect-error runtime guard
    expect(() => money(100, "EUR", "guessed", AS_OF)).toThrow(/basis/);
  });
});

describe("sumMoney()", () => {
  it("all billed → billed", () => {
    const total = sumMoney([
      money(100_00, "EUR", "billed", AS_OF),
      money(200_00, "EUR", "billed", AS_OF),
    ]);
    expect(total.amount).toBe(300_00);
    expect(total.basis).toBe("billed");
  });

  it("billed + estimated → estimated (invariant)", () => {
    const total = sumMoney([
      money(100_00, "EUR", "billed", AS_OF),
      money(50_00, "EUR", "estimated", AS_OF),
    ]);
    expect(total.basis).toBe("estimated");
  });

  it("all estimated → estimated", () => {
    const total = sumMoney([
      money(100_00, "EUR", "estimated", AS_OF),
      money(200_00, "EUR", "estimated", AS_OF),
    ]);
    expect(total.basis).toBe("estimated");
  });

  it("refuses mixed currencies", () => {
    expect(() =>
      sumMoney([
        money(100, "EUR", "billed", AS_OF),
        money(100, "USD", "billed", AS_OF),
      ]),
    ).toThrow(/currencies/);
  });

  it("carries the newest asOf", () => {
    const total = sumMoney([
      money(100, "EUR", "billed", "2026-08-20"),
      money(100, "EUR", "billed", "2026-08-23"),
      money(100, "EUR", "billed", "2026-08-21"),
    ]);
    expect(total.asOf).toBe("2026-08-23");
  });
});

describe("scaleMoney()", () => {
  it("rounds to minor units", () => {
    const m = money(100_00, "EUR", "billed", AS_OF);
    expect(scaleMoney(m, 1.005).amount).toBe(100_50);
  });
});
