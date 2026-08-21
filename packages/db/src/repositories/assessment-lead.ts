import type { PoolClient } from "pg";
import { withoutTenant } from "../tenant-context.ts";

export type AssessmentLeadInput = {
  email: string;
  company?: string | null;
  workspaceHost?: string | null;
  spendBand?: string | null;
  notes?: string | null;
  source?: string | null;
  ipAddress?: string | null;
  userAgentHash?: string | null;
};

/**
 * Insert an inbound assessment lead. Not tenant-scoped — leads exist
 * before signup. Deliberately runs without a TenantContext.
 */
export async function createAssessmentLead(input: AssessmentLeadInput): Promise<string> {
  return withoutTenant(async (client: PoolClient) => {
    const res = await client.query<{ id: string }>(
      `INSERT INTO assessment_lead
         (email, company, workspace_host, spend_band, notes, source, ip_address, user_agent_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        input.email,
        input.company ?? null,
        input.workspaceHost ?? null,
        input.spendBand ?? null,
        input.notes ?? null,
        input.source ?? null,
        input.ipAddress ?? null,
        input.userAgentHash ?? null,
      ],
    );
    return res.rows[0]!.id;
  });
}
