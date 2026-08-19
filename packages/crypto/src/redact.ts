const REDACTED = "[REDACTED]";

const SECRET_KEYS = new Set([
  "secret",
  "password",
  "client_secret",
  "clientsecret",
  "authorization",
  "token",
  "access_token",
  "refresh_token",
  "master_key",
  "tare_master_key",
  "database_url",
  "sealed",
]);

export function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEYS.has(k.toLowerCase()) ? REDACTED : redact(v);
  }
  return out;
}
