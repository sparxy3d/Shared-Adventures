/**
 * Manually-run top-up of future sessions for DEMO listings (Sudeshi's P0.2).
 *
 *   npm run slots:topup -- --target=dev            # dry run: prints what WOULD be created
 *   npm run slots:topup -- --target=dev --apply    # writes
 *   npm run slots:topup -- --target=prod           # Madushan only: dry run first, then --apply
 *
 * Rules (do not loosen):
 * - Never called from server startup, seed.ts, or any timer. Run by hand only.
 * - Only PUBLISHED listings whose vendor is owned by a demo login (DEMO_OWNER_EMAILS).
 * - Copies each listing's existing weekly pattern: every (weekday, start time, end time)
 *   already present in its sessions. Capacity is the listing's normal capacity
 *   (experiences.capacity, falling back to 10 exactly like the seed does).
 * - Creates sessions from tomorrow (Asia/Colombo) through END_DATE.
 * - INSERT ONLY where no session exists for the same listing, date and start time.
 *   It never updates or deletes a row.
 * - --target is required and picks the database explicitly: dev -> NEON_DATABASE_URL_DEV,
 *   prod -> NEON_DATABASE_URL_PROD. There is no fallback to DATABASE_URL, so a missing
 *   secret stops the script instead of silently writing to the wrong database.
 */
import pg from "pg";

const END_DATE = "2026-12-31";
const DEMO_OWNER_EMAILS = ["vendor1@freespirit.com", "vendor2@freespirit.com"];
const FALLBACK_CAPACITY = 10; // same default as the seed's COALESCE(e.capacity, 10)

type Target = "dev" | "prod";

function parseArgs(argv: string[]): { target: Target; apply: boolean } {
  const targetArg = argv.find((a) => a.startsWith("--target="));
  const target = targetArg?.split("=")[1];
  if (target !== "dev" && target !== "prod") {
    console.error("Refusing to run: pass --target=dev or --target=prod.");
    process.exit(2);
  }
  const unknown = argv.filter((a) => !a.startsWith("--target=") && a !== "--apply");
  if (unknown.length) {
    console.error(`Unknown argument(s): ${unknown.join(" ")}`);
    process.exit(2);
  }
  return { target, apply: argv.includes("--apply") };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date in Asia/Colombo (UTC+05:30, no DST) as YYYY-MM-DD. */
function colomboToday(): string {
  const d = new Date(Date.now() + (5 * 60 + 30) * 60_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

function dayOfWeek(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
}

function normaliseHHMM(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${pad(h)}:${pad(m)}`;
}

async function main() {
  const { target, apply } = parseArgs(process.argv.slice(2));
  const envName = target === "dev" ? "NEON_DATABASE_URL_DEV" : "NEON_DATABASE_URL_PROD";
  const url = process.env[envName];
  if (!url) {
    console.error(`Refusing to run: ${envName} is not set (no fallback to DATABASE_URL by design).`);
    process.exit(2);
  }

  const parsed = new URL(url);
  console.log(`Target:   ${target.toUpperCase()}  (${envName})`);
  console.log(`Host:     ${parsed.hostname}`);
  console.log(`Database: ${parsed.pathname.replace(/^\//, "") || "(default)"}`);
  console.log(`Mode:     ${apply ? "APPLY — rows will be inserted" : "DRY RUN — nothing is written"}`);

  const from = addDays(colomboToday(), 1);
  if (from > END_DATE) {
    console.log(`Nothing to do: tomorrow (${from}) is after ${END_DATE}.`);
    return;
  }
  console.log(`Window:   ${from} → ${END_DATE} (Asia/Colombo)\n`);

  const pool = new pg.Pool({ connectionString: url, max: 2 });
  const client = await pool.connect();
  try {
    const { rows: listings } = await client.query<{
      id: number; title: string; capacity: number | null; business_name: string; owner: string;
    }>(
      `SELECT e.id, e.title, e.capacity, v.business_name, lower(u.email) AS owner
         FROM experiences e
         JOIN vendors v ON v.id = e.vendor_id
         JOIN users u ON u.id = v.owner_profile_id
        WHERE e.status = 'published' AND lower(u.email) = ANY($1::text[])
        ORDER BY v.id, e.id`,
      [DEMO_OWNER_EMAILS],
    );

    const { rows: skipped } = await client.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM experiences e
         JOIN vendors v ON v.id = e.vendor_id JOIN users u ON u.id = v.owner_profile_id
        WHERE NOT (e.status = 'published' AND lower(u.email) = ANY($1::text[]))`,
      [DEMO_OWNER_EMAILS],
    );

    type Planned = { experienceId: number; date: string; startTime: string; endTime: string; capacity: number };
    const plan: Planned[] = [];
    const report: Array<{ id: number; listing: string; vendor: string; pattern: string; capacity: number; wouldCreate: number }> = [];

    for (const l of listings) {
      const { rows: pattern } = await client.query<{ dow: number; start_time: string; end_time: string }>(
        `SELECT DISTINCT extract(dow FROM date::date)::int AS dow, start_time, end_time
           FROM availability_slots WHERE experience_id = $1`,
        [l.id],
      );
      const { rows: existing } = await client.query<{ date: string; start_time: string }>(
        `SELECT date, start_time FROM availability_slots
          WHERE experience_id = $1 AND date >= $2 AND date <= $3`,
        [l.id, from, END_DATE],
      );
      const taken = new Set(existing.map((s) => `${s.date}|${normaliseHHMM(s.start_time)}`));
      const capacity = l.capacity ?? FALLBACK_CAPACITY;

      // One entry per (weekday, start time); if a start time has several end times, keep the first.
      const byDow = new Map<number, Map<string, string>>();
      for (const p of pattern) {
        const start = normaliseHHMM(p.start_time);
        const times = byDow.get(p.dow) ?? new Map<string, string>();
        if (!times.has(start)) times.set(start, normaliseHHMM(p.end_time));
        byDow.set(p.dow, times);
      }

      let count = 0;
      for (let d = from; d <= END_DATE; d = addDays(d, 1)) {
        const times = byDow.get(dayOfWeek(d));
        if (!times) continue;
        for (const [start, end] of times) {
          const key = `${d}|${start}`;
          if (taken.has(key)) continue;
          taken.add(key);
          plan.push({ experienceId: l.id, date: d, startTime: start, endTime: end, capacity });
          count++;
        }
      }

      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dowList = [...byDow.keys()].sort().map((d) => days[d]).join(",");
      const timeList = [...new Set(pattern.map((p) => normaliseHHMM(p.start_time)))].sort().join(",");
      report.push({
        id: l.id,
        listing: l.title.slice(0, 40),
        vendor: l.business_name,
        pattern: pattern.length ? `${dowList} @ ${timeList}` : "no existing sessions — skipped",
        capacity,
        wouldCreate: count,
      });
    }

    console.table(report);
    console.log(`Demo listings: ${listings.length}. Other listings skipped (not published, or not a demo vendor): ${skipped[0].n}.`);
    console.log(`${apply ? "Creating" : "Would create"} ${plan.length} session(s) in total.`);

    if (!apply) {
      console.log("\nDry run only. Re-run with --apply to write.");
      return;
    }

    await client.query("BEGIN");
    let inserted = 0;
    for (const s of plan) {
      // Guarded per row, so a concurrent writer or a re-run can never create a duplicate.
      const r = await client.query(
        `INSERT INTO availability_slots (experience_id, date, start_time, end_time, capacity, status)
         SELECT $1, $2, $3, $4, $5, 'open'
          WHERE NOT EXISTS (
            SELECT 1 FROM availability_slots
             WHERE experience_id = $1 AND date = $2 AND start_time = $3
          )`,
        [s.experienceId, s.date, s.startTime, s.endTime, s.capacity],
      );
      inserted += r.rowCount ?? 0;
    }
    await client.query("COMMIT");
    console.log(`\nInserted ${inserted} session(s). Re-running now would insert 0.`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Failed; nothing was written:", (err as Error).message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
