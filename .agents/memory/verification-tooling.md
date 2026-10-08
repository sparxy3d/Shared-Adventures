---
name: Browser verification tooling
description: Available browser tooling and timing safeguards for React UI verification
---

The bundled testing instructions may advertise a testing subagent kind that this
workspace's callback runtime rejects as unsupported. Do not repeatedly call an
unsupported service or add application dependencies just to replace it. Use the
installed browser and existing tooling for authenticated verification instead.

**Why:** The advertised testing service was unavailable during member-account
verification, while the workspace already had a working browser.

**How to apply:** Check service availability once; if unsupported, choose a
supported verification method and distinguish real requests from intercepted
browser fixtures in the report.

## React render and scroll timing

Browser command completion is not proof that React has rendered the new state
or that scrolling has stopped. Native mouse coordinates can become stale
between press and release while a page starts its requested smooth scroll.

**Why:** Fast automated filter changes produced missed clicks and assertions
against the preceding results even though ordinary first-tap interaction worked.

**How to apply:** Wait for the specific resulting UI state. For action-logic
checks, DOM clicks avoid scroll-coordinate races; retain native pointer checks
where actual physical interaction or user-gesture behavior is the requirement.
