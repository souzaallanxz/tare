# Tare

Cost observability and optimisation for Databricks.

> Know what you spent. Know what you only think you spent.

Phase 0 skeleton: information architecture on fixture data, plus the packages that Phase 1a will fill.

## Layout

```
apps/
  web/               Next.js App Router. All screens on fixtures.
packages/
  core/              Pure domain: Money, Basis, capabilities, state machine, dates.
  db/                Postgres migrations, pool, tenant-scoped repositories.
  ingest/            Source interface, Databricks + CSV implementations, pipeline.
  rules/             Six detection rules, forecast, anomaly detection. Pure.
  verify/            28-day savings verification against billed data.
  email/             Weekly report template (Outlook-safe).
  crypto/            Envelope encryption for workspace connection secrets.
  config/            Shared tsconfig presets.
```

Fence rules (enforce in lint once someone drifts):

- `apps/web` imports `core`, `db` (repositories only), `email`, `rules`. Never `ingest` or `crypto`.
- `core` imports nothing. Zero I/O.
- `rules` receive data as arguments. A rule never runs a query.
- `ingest` is the only package that talks to Databricks.

## Setup

```
pnpm install
cp .env.example .env.local          # fill in DATABASE_URL + TARE_MASTER_KEY
pnpm --filter @tare/db migrate      # apply SQL migrations
pnpm dev                            # http://localhost:3000
```

Generate the master key:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## The two commitments

Everything else follows from these:

1. **billed and estimated numbers are never mixed.** Every monetary value the product displays carries its
   basis, visually and in the data model. `sumMoney(billed + estimated) → estimated`, always. Enforced in
   [`packages/core/src/money.ts`](packages/core/src/money.ts) and by column-level constraints in the schema.

2. **savings are only claimed once verified against subsequent billing.** A recommendation is a suggestion.
   A saving is a fact with a date. State machine in
   [`packages/core/src/state.ts`](packages/core/src/state.ts), verification in
   [`packages/verify/`](packages/verify/).
