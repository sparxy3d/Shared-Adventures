# Stack profile: SQL (PostgreSQL with drizzle)

Edited 2026-10-08 to match this repo. Applies to `shared/schema.ts`, `server/storage.ts`,
and `server/seed.ts`.

## Where the schema lives

Every schema change starts as a new, numbered `migrations/*.sql` file, with
`shared/schema.ts` updated to match application-facing tables. Applied files are
immutable. ADR 013 supersedes the earlier manual production SQL process.

## Naming

- Tables are plural snake_case (`availability_slots`), and columns are snake_case
  (`price_amount`). TypeScript properties are camelCase.
- Foreign keys are `<thing>_id`. A user reference is named for its role
  (`customer_profile_id`, `owner_profile_id`).

## Every new table

- `id serial primary key`, `created_at timestamp default now()`.
- Foreign keys declared with `.references()`.
- An owner column when the data belongs to a vendor or a customer, so queries can filter on it.
- An insert schema from `createInsertSchema(...).omit({ id: true, createdAt: true })`, and
  exported `Insert*` and select types.

## Ownership

There is no row-level security. Every query that serves a vendor or customer endpoint
filters by that owner in the `where` clause, or the handler checks ownership before it
writes.

## Changing schema

1. Write the next numbered additive SQL file in `migrations/`. Update `shared/schema.ts`
   for tables used by drizzle; never alter or delete a file already applied anywhere.
2. Keep compatibility with the previous running version of the app. Expand first;
   backfill and contract in separate releases. Avoid column renames/drop-plus-add.
3. Run `npm run db:status`, `npm run db:migrate`, `npm run check`,
   `npm run build`, `npm run test:migrations` on development.
4. The production bundle copies the SQL files. Startup takes an advisory lock and
   applies pending files transactionally before listening; a failure exits non-zero.
5. Existing hand-upgraded databases require the one-time explicit `db:baseline`
   of 007 and 009 through 012. New environments are branched from Neon production.
6. Never run db:push or hand SQL against production. Never put a one-off schema
   backfill into seed code in place of a tracked migration.

## Queries

- Use the drizzle query builder or `sql` templates with parameters. Never concatenate strings.
- Bind integers to integer columns (`Math.round`). A fractional value fails the statement.
- Lists use a join or `inArray`, not a query per row. Do not load a whole table to filter
  in JavaScript.
- Add an index when a new filter runs on every search request.
- `availability_slots.date` is `YYYY-MM-DD` text, and times are `HH:MM` text. They compare
  correctly as strings only when they are in the same zone.

## Do not

- Run db:push or hand SQL in production, even after a successful development check.
- Add a required column to a table with rows without an additive default/backfill
  and compatibility plan.
- Store money in minor units. This repo stores whole LKR.
- Seed demo users in a production database that has real customers.
