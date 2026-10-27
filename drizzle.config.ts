import { defineConfig } from "drizzle-kit";

// Introspection only. Schema changes use numbered SQL, never drizzle-kit push.
if (process.env.DB_TARGET === "prod" || process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT) {
  throw new Error("Drizzle production access is disabled. Use tracked migrations.");
}
if (process.argv.some(arg => arg === "push" || arg === "generate")) {
  throw new Error("Write a new numbered migrations/*.sql file; schema pushes/generation are disabled.");
}
const url = process.env.NEON_DATABASE_URL_DEV || process.env.DATABASE_URL;

if (!url) {
  throw new Error("No development database connection string set");
}

export default defineConfig({
  out: "./generated-artifacts/drizzle",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url },
});
