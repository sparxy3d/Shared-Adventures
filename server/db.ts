import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

// Prefer user-managed Neon databases: PROD in the published app, DEV while
// developing. Falls back to the default (Replit-managed) DATABASE_URL when
// the matching Neon secret is absent. The DEV secret is NEVER used in
// production, even if it is the only one set.
const isProduction =
  process.env.NODE_ENV === "production" || !!process.env.REPLIT_DEPLOYMENT;

const connectionString = isProduction
  ? process.env.NEON_DATABASE_URL_PROD || process.env.DATABASE_URL
  : process.env.NEON_DATABASE_URL_DEV || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("No database connection string set (NEON_DATABASE_URL_DEV/PROD or DATABASE_URL)");
}

export const pool = new pg.Pool({ connectionString });

export const db = drizzle(pool, { schema });
