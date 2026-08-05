import { defineConfig } from "drizzle-kit";

// Schema pushes target the Neon PROD db when DB_TARGET=prod, otherwise the
// Neon DEV db, falling back to Replit's built-in database.
const url =
  (process.env.DB_TARGET === "prod"
    ? process.env.NEON_DATABASE_URL_PROD
    : process.env.NEON_DATABASE_URL_DEV) || process.env.DATABASE_URL;

if (!url) {
  throw new Error("No database connection string set (NEON_DATABASE_URL_DEV/PROD or DATABASE_URL)");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url },
});
