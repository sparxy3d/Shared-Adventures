---
name: Browser verification tooling
description: Browser timing safeguards and raster transparency verification
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

## Browser permissions and native dialogs

Native OS flows and a browser fallback are separate verification targets.
Synthetic DOM clicks do not establish real user activation; do not treat a
headless native-share attempt as proof that clipboard sharing was exercised.

**Why:** A headless share attempt did not reach the clipboard branch, although
the fallback subsequently passed an actual clipboard write/read check.

**How to apply:** Use trusted input for permission-bearing native flows. When
selecting a fallback in the test browser, label that explicitly and report native
OS/device checks separately. Keep authenticated scenarios in a single browser
session rather than depending on profile restoration.

## Form selectors and mutation replays

Scope field selectors to the form or UI region, and verify the element type before
using a native input-value setter. After a test has made writes, continue with a
read-only check or a targeted scenario rather than blindly rerunning creation.

**Why:** A description field selector also matched a document metadata element,
and a later browser timeout occurred after its application had already succeeded.
Repeating the whole mutation scenario would create unnecessary test accounts.

**How to apply:** Separate mutation and read-only verification modes, label test
records, and restore reserved booking inventory even when a later assertion fails.

## Document navigation and hash changes

Wait for the intended new document and route, not only a selector that may already
exist in the preceding page. Resume mutation tests using the fixture's current
state; do not expect a newly empty draft after it already has saved sessions.

**Why:** Multi-page/viewport checks could inspect the preceding document, while
resumed tests wrongly expected missing-session guidance after successful generation.

**How to apply:** Separate creation from read-only layout passes and verify navigation
completion before querying the new page.

Fragment navigation can emit popstate. An unsaved-change guard must distinguish
same-page path/query matches from leaving the page.

**Why:** In-page editor anchors triggered a leave confirmation even though the
user was still editing the same listing.

**How to apply:** Include same-page anchors and browser history in unsaved-change
tests, not just links to another screen.

## Raster transparency verification

Verify transparency with actual pixel alpha and a flattened preview on a contrasting
background before deriving small logo assets. An RGBA file alone is not proof.

**Why:** Alpha transformations can leave opaque black or coloured edge artifacts,
which are hard to distinguish from a viewer's black transparency background.

**How to apply:** Check both the outer background and interior cut-outs on light
and dark backgrounds; preserve illustrated negative space when removing a solid colour.
