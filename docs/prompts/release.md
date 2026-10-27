# Release check (before and after publishing)

Publishing is done by a person (Sudeshi or Madushan) in Replit. The agent never publishes.
Use this when someone asks "can I publish?" or "check the live site".

## Before publishing ("can I publish?")

Check and report each line as OK or NOT OK, in plain words:

1. **Work finished.** Every spec changed since the last publish has `Status: done` and a
   `verification.md` that says **Ready to publish: Yes**. Nothing is half-built in the
   workspace (no spec `in progress`).
2. **Builds.** `npm run check` and `npm run build` pass now.
3. **Database.** `npm run db:status` on development shows every file applied and none pending.
   List any migration files added since the last publish: production applies them
   automatically when the new version starts. Confirm each is additive (adds tables,
   columns or rows; does not drop, rename or rewrite).
4. **Production settings.** List any new secret or environment variable the change needs and
   whether it exists in the deployment's secrets (names only, never values). Missing means
   NOT OK.
5. **GitHub.** Local commits are pushed to GitHub (`git status`, ahead count 0 after a fetch).

Finish with **OK to publish: Yes / No**. If No, say exactly what is missing and who fixes it.

## After publishing ("check the live site")

Read-only. Do not change anything.

1. **Start-up log** of the new deployment: report the `[migrations]` lines (which files were
   applied) and confirm `serving on port` appears with no errors after it.
2. **Smoke test** https://freespirit.club: the home page loads; `GET /api/site-config` returns
   200; log in as the demo admin and call `/api/auth/me`, `/api/admin/stats`,
   `/api/admin/vendors`, `/api/admin/experiences`, `/api/admin/bookings`; then log out.
   Add the endpoints of whatever was just released.
3. **Errors** in the production logs since the publish, grouped by endpoint, without
   personal data or secret values.

Finish with **Live site: OK / Problem**. For a problem, give the likely cause in one line and
stop. Fixes go through `docs/prompts/request.md` like any other change. If the site is badly
broken, tell the requester to contact Madushan, who can roll back the deployment in Replit or
restore the database from Neon (7-day history).
