export type Basis = "billed" | "estimated";

export const BASIS_BILLED: Basis = "billed";
export const BASIS_ESTIMATED: Basis = "estimated";

export function combineBasis(a: Basis, b: Basis): Basis {
  return a === "billed" && b === "billed" ? "billed" : "estimated";
}
