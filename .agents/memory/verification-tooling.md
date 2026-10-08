---
name: Browser verification tooling
description: How to handle a mismatch between bundled testing instructions and available services
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
