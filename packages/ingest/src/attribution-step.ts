import { attribute, type AttrRule } from "@tare/rules";
import type { TenantContext } from "@tare/db";
import { toIsoDate } from "@tare/core";
import {
  entitySignals,
  listAttributionRules,
  replaceEntityOwners,
} from "@tare/db/repositories";

/**
 * Runs the pure attribution engine against everything currently in the tenant
 * and writes the resulting entity_owner rows. Manual assignments are preserved
 * — replaceEntityOwners refuses to overwrite them.
 *
 * Also snapshots per-rule hit counts into attribution_rule_hit for the day.
 * Drift detection reads those snapshots.
 */
export async function resolveAttribution(
  ctx: TenantContext,
): Promise<{ resolved: number; unattributed: number }> {
  const [signals, dbRules] = await Promise.all([entitySignals(ctx), listAttributionRules(ctx)]);
  const rules: AttrRule[] = dbRules.map((r) => ({
    id: r.id,
    priority: r.priority,
    matcher: r.matcher,
    ownerId: r.ownerId,
    active: r.active,
  }));

  const assignments = attribute(signals, rules);
  await replaceEntityOwners(ctx, assignments);

  // Count entities matched per rule and snapshot for today. Idempotent by (rule, date).
  const hitByRule = new Map<string, number>();
  for (const rule of rules) hitByRule.set(rule.id, 0);
  for (const a of assignments) if (a.ruleId) hitByRule.set(a.ruleId, (hitByRule.get(a.ruleId) ?? 0) + 1);

  const today = toIsoDate(new Date());
  for (const [ruleId, entities] of hitByRule) {
    await ctx.query(
      `INSERT INTO attribution_rule_hit (tenant_id, rule_id, observed_on, entities)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, rule_id, observed_on) DO UPDATE SET entities = EXCLUDED.entities`,
      [ctx.tenantId, ruleId, today, entities],
    );
  }

  const unattributed = assignments.filter((a) => a.ownerId === null).length;
  return { resolved: assignments.length - unattributed, unattributed };
}
