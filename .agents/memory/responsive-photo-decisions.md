---
name: Responsive photo decisions
description: Source-size and browser selection constraints for curated photo derivatives
---

Retain original curated artwork and never enlarge a source just to reach a nominal
1600px target. Use the actual output width in the source-set descriptor.

**Why:** Existing curated sources are only 1024px or 1280px wide. Upscaling adds
bytes without detail and would misrepresent the available resolution.

**How to apply:** Regenerate all targets together when a curated original changes.
Keep stored original paths compatible; uploaded images use their existing variants.

Prefer explicit, layout-specific sizes over automatic sizes for these photo tiles.

**Why:** Browser measurements with automatic sizes downloaded source-sized candidates
for absolutely positioned category images even though the visible tiles were small.

**How to apply:** Include phone and high-density network checks whenever changing
image sizing, not just a visual screenshot.
