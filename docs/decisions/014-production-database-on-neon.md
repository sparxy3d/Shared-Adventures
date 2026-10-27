# 014. Production runs on the Neon `production` branch; the Replit database is retired

- Status: accepted
- Date: 2026-10-27
- Deciders: Madushan
- Related spec: none (operational change)

## Context

The docs said production used Neon, but the deployment's `NEON_DATABASE_URL_PROD` pointed at
Replit's own managed database. Migrations applied to the Neon `production` branch never
reached the live site, and nobody noticed for weeks. The Neon project also sat in a separate
account with a 6-hour restore window.

## Decision

The live site uses Neon project `FREE-SPIRIT` (`small-fire-32869842`), branch `production`,
database `free_spirit`, in Madushan's organisation, with a 7-day restore window. Development
uses branch `develop`. The Replit-managed database is retired: its users, vendor application
and booking were copied into Neon on 2026-10-27, and nothing reads from it.

## Options considered

| Option | For | Against |
|---|---|---|
| Neon `production` branch (chosen) | Branching for test copies, 7-day restore, same org as Mira, matches the docs | One more account to manage |
| Keep Replit's database | No move needed | No branching, unclear backups, outside our control |

## Consequences

- Easier: test copies by branching, point-in-time restore, schema comparison between branches.
- Harder: deployment secrets must point at Neon. A wrong connection string fails silently.
- New obligations: the release check confirms which database production uses. Delete test
  branches after use, because they hold copies of real data.

## Revisit when

Moving off Replit hosting, or data volume needs a higher Neon plan.
