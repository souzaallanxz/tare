import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function ensureTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migration (
      id          TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      checksum    TEXT NOT NULL
    )
  `);
}

async function main(): Promise<void> {
  const url = process.env["DATABASE_URL_DIRECT"] ?? process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL_DIRECT or DATABASE_URL must be set");

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await ensureTable(client);
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM schema_migration`);
    const applied = new Set(rows.map((r) => r.id));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  skip ${file}`);
        continue;
      }
      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
      const checksum = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sql))
        .then((b) => Buffer.from(b).toString("hex"));

      console.log(`apply ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO schema_migration (id, checksum) VALUES ($1, $2)`,
          [file, checksum],
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    console.log("migrations up to date");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
