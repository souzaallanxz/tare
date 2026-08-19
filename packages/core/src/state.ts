export type RecommendationState =
  | "open"
  | "accepted"
  | "applied"
  | "verifying"
  | "confirmed"
  | "not_observed";

const TRANSITIONS: Record<RecommendationState, readonly RecommendationState[]> = {
  open: ["accepted"],
  accepted: ["applied", "open"],
  applied: ["verifying"],
  verifying: ["confirmed", "not_observed"],
  confirmed: [],
  not_observed: [],
};

export function canTransition(
  from: RecommendationState,
  to: RecommendationState,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: RecommendationState,
  to: RecommendationState,
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal recommendation transition: ${from} → ${to}`);
  }
}

export function isTerminal(state: RecommendationState): boolean {
  return state === "confirmed" || state === "not_observed";
}
