/**
 * Fail-fast environment validator. Called once at cold start of any route
 * that touches the pool. Missing a required var is a deploy problem, not a
 * user problem — this refuses to serve traffic until it is fixed.
 */
const REQUIRED = [
  "DATABASE_URL",
  "TARE_MASTER_KEY",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
] as const;

const PRODUCTION_REQUIRED = [
  "EMAIL_FROM",
  "CRON_SECRET",
] as const;

let checked = false;
export function requireEnv(): void {
  if (checked) return;
  const missing: string[] = [];
  for (const name of REQUIRED) {
    if (!process.env[name]) missing.push(name);
  }
  if (process.env["NODE_ENV"] === "production") {
    for (const name of PRODUCTION_REQUIRED) {
      if (!process.env[name]) missing.push(name);
    }
    if (process.env["USE_FAKE_INGEST"] === "1") {
      throw new Error("USE_FAKE_INGEST must not be set in production");
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
  checked = true;
}
