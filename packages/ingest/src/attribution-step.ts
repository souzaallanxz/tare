import { attribute, type AttrRule } from "@tare/rules";
import type { TenantContext } from "@tare/db";
import {
  entitySignals,
  listAttributionRules,
  replaceEntityOwners,
} from "@tare/db/repositories";

/**
 * Runs the pure attribution engine against everything currently in the tenant
 * and writes the resulting entity_owner rows. Manual assignments are preserved
 * — replaceEntityOwners refuses to overwrite them.
 */
export async function resolveAttribution(ctx: TenantContext): Promise<{ resolved: number; unattributed: number }> {
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

  const unattributed = assignments.filter((a) => a.ownerId === null).length;
  return { resolved: assignments.length - unattributed, unattributed };
}
