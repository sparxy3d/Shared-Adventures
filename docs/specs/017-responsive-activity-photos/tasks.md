# 017 Implementation checklist

Status: implemented and verified in development, following Madushan's 12 November 2026 go-ahead. Not published.

- [x] Record Madushan's exact approval in spec.md before application edits.
- [x] Capture reproducible before measurements and screenshots for home, For vendors and a populated listing editor at 375px/1440px. Inventory referenced activity photos. Covers AC1, AC2, AC7.
- [x] Add static derivative generation and curated manifest; retain originals and validate output dimensions/content. Covers AC1, AC2.
- [x] Implement shared responsive renderer with uploaded-srcset support, accurate sizing, priority, reserved space and finite fallback. Test source selection and failed requests in the same change. Covers AC1–AC5.
- [x] Integrate all named pages/components, including shared admin editor and existing hero art direction. Check picker/gallery/navigation behaviour. An initial favorites mock reached a DEV DELETE; the final test blocks unintended writes. See verification.md. Covers AC2–AC6.
- [x] Capture comparable after measurements, inspect desktop/phone/high-density screenshots, investigate regressions, and report bytes and reductions. Covers AC7.
- [x] Run typecheck/build, audit scope, and write verification.md with changed files, measured results, exceptions and Ready to publish status. Covers AC8.

## Final check

- No backend, schema, migration, seed, ENABLE_SEED, upload-processing or bucket changes.
- Original photo files and special homepage hero/sports picture markup retained.
- Existing onboarding regression fixture repaired to create its migration-managed session table in its disposable schema.
- All completed checks and the development favorite-test side effect are recorded in verification.md.
- No production writes or publish. Final commit and fast-forward push are reported in chat.
