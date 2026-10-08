# Session-backed discovery

Status: accepted

Only the API's matching free nextSession may supply availability/time metadata.
Do not infer it from business opening hours or seeded prose.

**Why:** A business can be open without a bookable session, and real filters
must never produce nonmatching suggestions.

Draft choices drive the count while submitted choices drive the ideas section.
**Why:** Editing a control must not silently relabel a previously submitted list.

Nearest-city mapping uses the catalog exclusively in browser memory.
**Why:** Location permission should not disclose coordinates to the application
server or persist a precise location.
