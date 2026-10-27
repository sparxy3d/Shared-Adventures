import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg, { type Client } from "pg";

export interface MigrationFile {
  filename: string;
  checksum: string;
  sql: string;
}

export function migrationDirectory() {
  return typeof __dirname === "string"
    ? resolve(__dirname, "migrations")
    : resolve("migrations");
}

// Session locks must not run through Neon's transaction pooler. This changes
// only the transport endpoint, never the selected database or environment.
export function migrationClient(connectionString: string) {
  const url = new URL(connectionString);
  if (url.hostname.endsWith(".neon.tech")) {
    url.hostname = url.hostname.replace(/-pooler(?=\.)/, "");
  }
  return new pg.Client({ connectionString: url.toString() });
}

export async function readMigrations(directory = migrationDirectory()): Promise<MigrationFile[]> {
  const names = (await readdir(directory)).filter(name => name.endsWith(".sql"));
  if (names.some(name => !/^\d+_[a-z0-9_]+\.sql$/.test(name))) {
    throw new Error("Migration filenames must be numbered: NNN_description.sql");
  }
  names.sort((a, b) => Number(a.split("_")[0]) - Number(b.split("_")[0]));
  if (new Set(names.map(name => Number(name.split("_")[0]))).size !== names.length) {
    throw new Error("Duplicate migration number");
  }
  if (!names.length) throw new Error("No migration SQL files found");
  return Promise.all(names.map(async filename => {
    const bytes = await readFile(resolve(directory, filename));
    return { filename, checksum: createHash("sha256").update(bytes).digest("hex"), sql: bytes.toString("utf8") };
  }));
}

type Applied = { filename: string; checksum: string; applied_at: Date };
const legacyNames = [
  "007_vendor_verification.sql", "009_commission_dual_pricing.sql",
  "010_vendor_onboarding_gaps.sql", "011_multi_activity_applications.sql",
  "012_vendor_fee_plans.sql",
];
const baselineColumns: Record<string, string[]> = {
  users: ["is_sri_lankan_resident", "must_change_password"],
  vendors: ["taking_bookings", "first_listing_published_at", "commission_override_rate",
    "is_demo", "application_activities", "commission_introductory_rate",
    "commission_standard_rate", "commission_introductory_months"],
  experiences: ["visitor_price_usd", "is_demo", "typical_group_sizes"],
  experience_images: ["storage_key"],
  bookings: ["resident_count", "visitor_count", "lkr_unit_price", "usd_unit_price",
    "exchange_rate_used", "commission_rate_applied", "commission_amount_lkr", "vendor_net_amount_lkr"],
  vendor_documents: ["contents", "deleted_at", "deleted_by"],
  pricing_settings: ["usd_to_lkr_rate"],
  site_settings: ["show_demo_content", "bookings_open", "demo_tagged_at"],
  waiting_list: ["experience_id", "email"],
};

async function history(client: Client): Promise<Applied[]> {
  const exists = await client.query("SELECT to_regclass('schema_migrations') AS name");
  return exists.rows[0].name
    ? (await client.query<Applied>("SELECT filename, checksum, applied_at FROM schema_migrations ORDER BY filename")).rows
    : [];
}

function validateHistory(files: MigrationFile[], applied: Applied[]) {
  for (const row of applied) {
    const file = files.find(file => file.filename === row.filename);
    if (!file) throw new Error(`Applied migration file missing: ${row.filename}`);
    if (file.checksum !== row.checksum) throw new Error(`Applied migration checksum changed: ${row.filename}`);
  }
  const highest = Math.max(0, ...applied.map(row => Number(row.filename.split("_")[0])));
  for (const file of files) {
    if (Number(file.filename.split("_")[0]) < highest && !applied.some(row => row.filename === file.filename)) {
      throw new Error(`Out-of-order migration: ${file.filename}`);
    }
  }
}

async function createHistory(client: Client) {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
}

// Preserve historical files/checksums. Strip only their outer transaction
// wrapper; otherwise COMMIT would separate schema DDL from its history record.
function transactionBody(file: MigrationFile) {
  const withoutComments = file.sql.replace(/^\s*--[^\n]*(?:\n|$)/gm, "").trim();
  return /^BEGIN\s*;/i.test(withoutComments)
    ? withoutComments.replace(/^BEGIN\s*;/i, "").replace(/COMMIT\s*;\s*$/i, "")
    : file.sql;
}

export async function migrationStatus(client: Client, directory?: string) {
  const files = await readMigrations(directory);
  await client.query("BEGIN READ ONLY");
  try {
    const applied = await history(client);
    validateHistory(files, applied);
    const rows = files.map(file => ({
      filename: file.filename, checksum: file.checksum,
      status: applied.some(row => row.filename === file.filename) ? "applied" : "pending",
    }));
    await client.query("COMMIT");
    return rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function runMigrations(client: Client, options: { directory?: string; baseline?: boolean } = {}) {
  const files = await readMigrations(options.directory);
  await client.query("SELECT pg_advisory_lock(713013, 1)");
  try {
    const applied = await history(client);
    validateHistory(files, applied);
    if (options.baseline) {
      const baseline = legacyNames.map(name => {
        const file = files.find(file => file.filename === name);
        if (!file) throw new Error(`Baseline migration missing: ${name}`);
        return file;
      });
      // Verify the existing hand-applied schema before trusting the operator's baseline.
      const columns = await client.query<{ table_name: string; column_name: string }>(
        "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()");
      for (const [table, names] of Object.entries(baselineColumns)) {
        for (const column of names) {
          if (!columns.rows.some(row => row.table_name === table && row.column_name === column)) {
            throw new Error(`Cannot baseline: missing ${table}.${column}`);
          }
        }
      }
      await client.query("BEGIN");
      try {
        await createHistory(client);
        for (const file of baseline) {
          await client.query("INSERT INTO schema_migrations(filename, checksum) VALUES ($1,$2) ON CONFLICT (filename) DO NOTHING",
            [file.filename, file.checksum]);
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      return baseline.map(file => `Baselined ${file.filename} ${file.checksum}`);
    }
    if (!applied.length) {
      const legacy = await client.query("SELECT to_regclass('vendors') AS vendors, to_regclass('users') AS users");
      if (legacy.rows[0].vendors || legacy.rows[0].users) {
        throw new Error("Baseline required: existing application schema has no tracked migrations. Run db:baseline after verifying 007 through 012.");
      }
      if (files.some(file => legacyNames.includes(file.filename))) {
        throw new Error("New environment required: branch the Neon production database, then check db:status. Empty-database bootstrap is not supported.");
      }
    }
    const messages: string[] = [];
    for (const file of files) {
      if (applied.some(row => row.filename === file.filename)) continue;
      await client.query("BEGIN");
      try {
        await createHistory(client);
        await client.query(transactionBody(file));
        await client.query("INSERT INTO schema_migrations(filename, checksum) VALUES ($1,$2)", [file.filename, file.checksum]);
        await client.query("COMMIT");
        messages.push(`Applied ${file.filename} ${file.checksum}`);
      } catch (error) {
        await client.query("ROLLBACK");
        // pg errors may contain row data or SQL parameters. Do not log those.
        const code = typeof error === "object" && error && "code" in error ? String(error.code) : "unknown";
        throw new Error(`Migration failed: ${file.filename} (PostgreSQL ${code})`);
      }
    }
    return messages;
  } finally {
    await client.query("SELECT pg_advisory_unlock(713013, 1)");
  }
}
