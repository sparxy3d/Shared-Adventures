import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

// Prefer user-managed Neon databases: PROD in the published app, DEV while
// developing. Falls back to Replit's built-in database if neither is set.
const connectionString =
  (process.env.NODE_ENV === "production"
    ? process.env.NEON_DATABASE_URL_PROD
    : process.env.NEON_DATABASE_URL_DEV) || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("No database connection string set (NEON_DATABASE_URL_DEV/PROD or DATABASE_URL)");
}

export const pool = new pg.Pool({ connectionString });

export const db = drizzle(pool, { schema });
