export type IngestErrorClass =
  | "transient"
  | "authentication"
  | "permission"
  | "schema_drift"
  | "quota"
  | "unknown";

export class IngestError extends Error {
  readonly class: IngestErrorClass;
  readonly retriable: boolean;
  readonly hint: string | null;

  constructor(
    cls: IngestErrorClass,
    message: string,
    opts: { retriable?: boolean; hint?: string | null; cause?: unknown } = {},
  ) {
    super(message, opts.cause ? { cause: opts.cause } : undefined);
    this.name = "IngestError";
    this.class = cls;
    this.retriable = opts.retriable ?? cls === "transient" || cls === "quota";
    this.hint = opts.hint ?? null;
  }
}

export function classify(err: unknown): IngestError {
  if (err instanceof IngestError) return err;
  const message = err instanceof Error ? err.message : String(err);

  if (/401|unauthori[sz]ed|invalid[_ ]token/i.test(message)) {
    return new IngestError("authentication", message, {
      hint: "The workspace connection secret was rejected. Rotate the service principal secret.",
      cause: err,
    });
  }
  if (/403|forbidden|permission|grant/i.test(message)) {
    return new IngestError("permission", message, {
      hint: "A required GRANT is missing. Re-apply the five GRANT statements in the connection screen.",
      cause: err,
    });
  }
  if (/429|rate limit|quota/i.test(message)) {
    return new IngestError("quota", message, { cause: err });
  }
  if (/column .* does not exist|relation .* does not exist/i.test(message)) {
    return new IngestError("schema_drift", message, {
      hint: "A system table changed shape. Do not surface this to the customer.",
      cause: err,
    });
  }
  if (/ETIMEDOUT|ECONNRESET|ENOTFOUND|network|timeout|5\d\d/i.test(message)) {
    return new IngestError("transient", message, { cause: err });
  }
  return new IngestError("unknown", message, { cause: err });
}
