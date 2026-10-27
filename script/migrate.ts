import "dotenv/config";
import { connectionString, pool } from "../server/db";
import { migrationClient, migrationStatus, runMigrations } from "../server/migrations";

async function main() {
  const command = process.argv[2] ?? "migrate";
  const client = migrationClient(connectionString);
  try {
    if (!["migrate", "status", "baseline"].includes(command)) throw new Error("Use migrate, status or baseline");
    await client.connect();
    if (command === "status") {
      for (const row of await migrationStatus(client)) console.log(`${row.status} ${row.filename} ${row.checksum}`);
    } else {
      for (const line of await runMigrations(client, { baseline: command === "baseline" })) console.log(line);
    }
  } catch (error) {
    console.error(`[migrations] ${error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]") : "Failed"}`);
    process.exitCode = 1;
  } finally {
    await client.end();
    await pool.end();
  }
}
void main();
