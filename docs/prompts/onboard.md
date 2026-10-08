# /onboard

Goal: fill `AGENTS.md` and `docs/context/` for this repository from the code that exists,
so that a new agent or engineer gets correct context in under ten minutes of reading.

Run this once per repo, and again when "Last verified" is more than three months old.

## Rules

- Evidence only. Every statement you write must trace to a file you read or a command you ran. Cite the path.
- If you cannot find evidence, write `UNKNOWN: <the question>` instead of a plausible guess.
- Do not change any source code, configuration, or dependency in this run.
- Do not restate what is obvious from a folder listing. Capture boundaries, reasons, and traps.
- Do not back-fill specs for features that already shipped.

## Steps

1. Survey. Read the root manifest files (`*.sln`, `*.csproj`, `package.json`, `angular.json`,
   `tsconfig*.json`, `Dockerfile`, `docker-compose*.yml`, CI pipeline files, `README*`, `.env.example`),
   the entry points, and the migration folder. List the stacks and versions you found.

2. Commands. Find the real build, test, lint, run, and migrate commands from scripts and CI.
   Run the ones that are safe and read-only (build, lint, unit tests). Record which passed.
   Mark anything you did not run as `UNVERIFIED`.

3. Architecture. Trace one typical authenticated request from entry point to database and
   back. Record the actual file for each step. Identify how the tenant is resolved and where
   isolation is enforced. If you find a data path with no tenant enforcement, list it under
   "Known debt and sharp edges" and flag it in your summary.

4. Fill the files, in this order:
   - `docs/context/tech.md`
   - `docs/context/architecture.md`
   - `docs/context/conventions.md`: keep the profile rows that apply, delete the others,
     and delete the unused files in `docs/context/profiles/`. Then edit each kept profile
     so it matches what this repo actually does. Where the repo deviates from the profile,
     change the profile and add a line under "Repo-specific rules".
   - `docs/context/product.md`: draft from README, UI text, and domain names. Mark it clearly
     as a draft, because product intent cannot be read from code.
   - `AGENTS.md`: fill the one-liner, the commands, and the non-negotiables. Remove rules
     that do not apply. Keep it under 150 lines.

5. Decisions. Propose three to five retrospective ADRs for choices that shape daily work
   (tenancy model, auth, data access, hosting). List them as titles with a one-line
   rationale. Do not write them until the owner confirms which are real.

6. Report. End with:
   - Files written
   - Every `UNKNOWN` and `UNVERIFIED` item, as a numbered list of questions for the owner
   - Risks found (security, tenancy, missing tests, missing migrations or backups)
   - Anything in the templates that did not fit this repo

## Done when

- No `<placeholder>` text remains in `AGENTS.md`, `tech.md`, or `architecture.md`.
- Every command in `tech.md` is either verified or marked `UNVERIFIED`.
- The owner has a short list of questions to answer, not a document to rewrite.
