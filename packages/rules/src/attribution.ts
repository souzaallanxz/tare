import type { AttributionSource, EntityKind } from "@tare/core";

/**
 * Pure attribution resolver.
 *
 *   attribute(entities, rules) → assignments
 *
 * Rules apply in priority order (lowest first). First match wins.
 * The `source` on each assignment records *which* signal matched, so the UI
 * can show "resolved from tag team=platform" instead of just an owner name.
 * Entities the engine cannot resolve stay unattributed — that surfaces as a
 * headline metric, not a footnote.
 */

export type Matcher =
  | { type: "tag"; key: string; value: string }
  | { type: "run_as_domain"; domain: string }
  | { type: "run_as_equals"; email: string }
  | { type: "creator"; user: string }
  | { type: "warehouse_id"; id: string };

export type AttrRule = {
  readonly id: string;
  readonly priority: number;
  readonly matcher: Matcher;
  readonly ownerId: string;
  readonly active: boolean;
};

export type AttrSignal = {
  readonly entityId: string;
  readonly entityKind: EntityKind;
  readonly entityExternalId: string;
  readonly tags: Readonly<Record<string, string>>;
  readonly runAs: string | null;
  readonly creator: string | null;
  readonly warehouseId: string | null;
};

export type Assignment = {
  readonly entityId: string;
  readonly ownerId: string | null;
  readonly source: AttributionSource | null;
  readonly ruleId: string | null;
};

export function attribute(
  signals: readonly AttrSignal[],
  rules: readonly AttrRule[],
): Assignment[] {
  const active = rules.filter((r) => r.active).sort((a, b) => a.priority - b.priority);
  return signals.map((s) => resolveOne(s, active));
}

function resolveOne(s: AttrSignal, rules: readonly AttrRule[]): Assignment {
  for (const r of rules) {
    const source = matchOne(r.matcher, s);
    if (source) return { entityId: s.entityId, ownerId: r.ownerId, source, ruleId: r.id };
  }
  return { entityId: s.entityId, ownerId: null, source: null, ruleId: null };
}

function matchOne(m: Matcher, s: AttrSignal): AttributionSource | null {
  switch (m.type) {
    case "tag":
      return s.tags[m.key] === m.value ? "tag" : null;
    case "run_as_equals":
      return s.runAs?.toLowerCase() === m.email.toLowerCase() ? "run_as" : null;
    case "run_as_domain":
      return s.runAs?.toLowerCase().endsWith(`@${m.domain.toLowerCase()}`) ? "run_as" : null;
    case "creator":
      return s.creator?.toLowerCase() === m.user.toLowerCase() ? "creator" : null;
    case "warehouse_id":
      return s.warehouseId === m.id ? "warehouse_id" : null;
  }
}
