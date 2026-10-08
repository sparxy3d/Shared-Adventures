# Stack profile: SQL (PostgreSQL with drizzle)

Edited 2026-10-08 to match this repo. Applies to `shared/schema.ts`, `server/storage.ts`,
and `server/seed.ts`.

## Where the schema lives

`shared/schema.ts` is the only definition. There are no migration files. `npm run db:push`
(drizzle-kit push) diffs the schema against a live database and applies the difference.

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

## Pushing schema changes

1. Change `shared/schema.ts`.
2. `npm run db:push` targets Neon DEV (or `DATABASE_URL`). Read every statement drizzle-kit
   proposes.
3. Drizzle-kit may propose dropping the `session` table, because connect-pg-simple owns it
   and it is not in the schema. Answer no. (UNVERIFIED; check the first time.)
4. Renames look like drop-plus-add, which loses data. Prefer add column, backfill, then drop
   in a later change.
5. PROD: `DB_TARGET=prod npm run db:push`, only after the change has run on DEV, and with a
   Neon branch or snapshot taken first.
6. Backfills that existing rows need go in `server/seed.ts` as idempotent per-record
   updates, or in a one-off script that is reviewed in the PR.

## Queries

- Use the drizzle query builder or `sql` templates with parameters. Never concatenate strings.
- Bind integers to integer columns (`Math.round`). A fractional value fails the statement.
- Lists use a join or `inArray`, not a query per row. Do not load a whole table to filter
  in JavaScript.
- Add an index when a new filter runs on every search request.
- `availability_slots.date` is `YYYY-MM-DD` text, and times are `HH:MM` text. They compare
  correctly as strings only when they are in the same zone.

## Do not

- Edit the database by hand in Neon PROD without recording it in the PR.
- Add a column without a default to a table with rows, unless the push handles the backfill.
- Store money in minor units. This repo stores whole LKR.
- Seed demo users in a production database that has real customers.
