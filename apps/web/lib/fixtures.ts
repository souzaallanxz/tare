/**
 * Fixture data for Phase 0. One internally consistent set:
 * August 2026, today = Monday 24 August, billed through the 23rd.
 * When real ingestion lands, these get deleted, not "gradually replaced".
 */
export const FIXTURE = {
  workspace: "prod-eu-west",
  period: "August 2026",
  today: "Mon 24 Aug 2026",
  ingestedAt: "24 Aug 2026 · 06:12 CET",

  billedMinor: 48_120_55,       // €48,120.55
  forecastMinor: 66_180_55,
  budgetMinor: 70_000_00,

  unattributedMinor: 20_210_63,
  unattributedPct: 42.0,
  lifetimeConfirmedMinor: 47_000_00,

  billedDays: 23,

  // 31 daily buckets, minor units. Values after billedDays are forecast.
  dailyMinor: [
    810_00, 790_00, 2280_00, 2340_00, 2210_00, 2290_00, 2260_00,
    820_00, 800_00, 2310_00, 2360_00, 2250_00, 2300_00, 2270_00,
    1100_00, 1080_00, 3540_00, 3610_00, 3480_00, 3560_00, 3520_00,
    1120_00, 1020_55,
    3545_00, 3610_00, 3480_00, 3560_00, 3520_00, 1120_00, 1020_00, 3545_00,
  ],

  workloads: [
    { name: "nightly-ingest",     kind: "job",       owner: "Data Platform", src: "tag",     mtdMinor: 18_905_40, projMinor: 25_610_00, findingId: null },
    { name: "ad-hoc-sql",         kind: "warehouse", owner: null,            src: null,      mtdMinor: 12_660_15, projMinor: 18_240_00, findingId: "R-126" },
    { name: "shared-interactive", kind: "cluster",   owner: null,            src: null,      mtdMinor:  7_550_48, projMinor:  9_980_00, findingId: "R-121" },
    { name: "bi-refresh",         kind: "job",       owner: "Analytics",     src: "run_as",  mtdMinor:  7_340_20, projMinor:  9_890_00, findingId: null },
    { name: "ml-training",        kind: "job",       owner: "Data Science",  src: "creator", mtdMinor:  1_664_32, projMinor:  2_460_55, findingId: null },
  ],

  owners: [
    { name: "Unattributed",  spendMinor: 20_210_63, pct: 42.0, src: "—",                  ents: 14 },
    { name: "Data Platform", spendMinor: 18_905_40, pct: 39.3, src: "tag team=platform",  ents:  6 },
    { name: "Analytics",     spendMinor:  7_340_20, pct: 15.2, src: "job run_as",         ents:  9 },
    { name: "Data Science",  spendMinor:  1_664_32, pct:  3.5, src: "cluster creator",    ents:  3 },
  ],

  attributionRules: [
    { priority: 1, matcher: "custom_tags.team = platform",                     owner: "Data Platform", hits: 6 },
    { priority: 2, matcher: "job.run_as ends with @analytics.acme.example",    owner: "Analytics",     hits: 9 },
    { priority: 3, matcher: "cluster.creator = m.silva",                        owner: "Data Science",  hits: 3 },
    { priority: 4, matcher: "warehouse_id = 8f2c1a · manual",                   owner: "Analytics",     hits: 1 },
  ],

  recommendations: [
    { id: "R-126", rule: "Cost break", entity: "ad-hoc-sql",         impactMinor:  4_120_00, basis: "billed" as const,    state: "open"        as const, when: "opened 15 Aug",           kind: "change" as const, why: "The 7-day mean is 3.1 times the 28-day baseline, past median plus three MAD. Reported as a change in cost, not a saving available." },
    { id: "R-121", rule: "No or long autotermination", entity: "shared-interactive", impactMinor: 880_40, basis: "billed" as const, state: "accepted" as const, when: "accepted 21 Aug",  kind: "cost" as const,   why: "The cluster has no autotermination set. Idle minutes over 28 days, priced at the rate actually charged, account for the amount shown." },
    { id: "R-118", rule: "Idle SQL warehouse", entity: "bi-warehouse", impactMinor: 610_00, basis: "billed" as const,    state: "verifying" as const, when: "applied 19 Aug · day 5 of 28", kind: "cost" as const,   why: "The warehouse stayed up 14 hours a day with query volume in the lowest decile. Auto-stop was set to 120 minutes on 19 August." },
    { id: "R-104", rule: "Jobs on all-purpose compute", entity: "nightly-ingest", impactMinor: 1_240_00, basis: "billed" as const, state: "confirmed" as const, when: "confirmed 12 Jul",  kind: "cost" as const,   why: "The job ran on all-purpose compute for seven months. Billed cost fell by this amount over the 28 days after the change, at comparable run volume." },
    { id: "R-097", rule: "Instance-type mismatch", entity: "ml-training",  impactMinor: 430_00, basis: "estimated" as const, state: "not_observed" as const, when: "closed 03 Aug",  kind: "cost" as const,   why: "Applied on 6 July. Billed cost did not fall in the following 28 days: run volume grew 3.2× in the same window, so no comparable baseline exists." },
    { id: "R-131", rule: "Unattributed spend", entity: "workspace",       impactMinor: null,      basis: "billed" as const, state: "open"        as const, when: "standing",              kind: "share" as const,  why: "42.0% of spend carries no tag, no job owner and no resolvable creator. Reported as a share of total, never as a recoverable amount." },
  ],

  ledger: [
    { d: "23 Aug", e: "nightly-ingest",     k: "job",         sku: "JOBS_COMPUTE", o: "Data Platform", u:  412.5, cMinor:  840_20, b: "billed" as const },
    { d: "23 Aug", e: "ad-hoc-sql",         k: "warehouse",   sku: "SQL_PRO",      o: null,            u:  186.0, cMinor:  604_50, b: "billed" as const },
    { d: "23 Aug", e: "shared-interactive", k: "cluster",     sku: "ALL_PURPOSE",  o: null,            u:   96.4, cMinor:  352_10, b: "billed" as const },
    { d: "22 Aug", e: "nightly-ingest",     k: "job",         sku: "JOBS_COMPUTE", o: "Data Platform", u:  409.1, cMinor:  833_30, b: "billed" as const },
    { d: "22 Aug", e: "ad-hoc-sql",         k: "warehouse",   sku: "SQL_PRO",      o: null,            u:  180.2, cMinor:  585_65, b: "billed" as const },
    { d: "22 Aug", e: "vm + storage",       k: "cloud infra", sku: "AZURE_VM",     o: null,            u: null,   cMinor: 1_120_00, b: "estimated" as const },
    { d: "21 Aug", e: "ad-hoc-sql",         k: "warehouse",   sku: "SQL_PRO",      o: null,            u:  604.9, cMinor: 1_965_90, b: "billed" as const },
    { d: "21 Aug", e: "nightly-ingest",     k: "job",         sku: "JOBS_COMPUTE", o: "Data Platform", u:  428.8, cMinor:  873_40, b: "billed" as const },
    { d: "21 Aug", e: "bi-refresh",         k: "job",         sku: "JOBS_COMPUTE", o: "Analytics",     u:  151.7, cMinor:  309_05, b: "billed" as const },
    { d: "21 Aug", e: "ml-training",        k: "job",         sku: "GPU_ML",       o: "Data Science",  u:   38.2, cMinor:  214_80, b: "billed" as const },
    { d: "20 Aug", e: "nightly-ingest",     k: "job",         sku: "JOBS_COMPUTE", o: "Data Platform", u:  414.0, cMinor:  843_30, b: "billed" as const },
    { d: "20 Aug", e: "shared-interactive", k: "cluster",     sku: "ALL_PURPOSE",  o: null,            u:  101.2, cMinor:  369_60, b: "billed" as const },
  ],

  runs: [
    { r: "#4821", s: "23 Aug 02:00", t: "48m 12s", st: "Succeeded",     cMinor:   840_20 },
    { r: "#4814", s: "22 Aug 02:00", t: "47m 51s", st: "Succeeded",     cMinor:   833_30 },
    { r: "#4807", s: "21 Aug 02:00", t: "52m 04s", st: "Succeeded",     cMinor:   873_40 },
    { r: "#4800", s: "20 Aug 02:00", t: "48m 33s", st: "Succeeded",     cMinor:   843_30 },
    { r: "#4793", s: "19 Aug 02:00", t: "61m 18s", st: "Retried once", cMinor: 1_002_75 },
  ],
} as const;

export type Fixture = typeof FIXTURE;
