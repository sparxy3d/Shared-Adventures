# Design

Use focused homepage components and a single discovery hook. Draft choices drive
the live count; submitted choices are snapshotted for stable results/headings.
All query keys include the exact serialized filters. Surprise uses a mutation.
Server-provided nextSession alone drives chips; explicit +05:30 anchors prevent
browser-zone errors. Geolocation uses catalog coordinates only in memory.

Share the existing auth query and favorites cache. Cards use existing favorite
endpoints and preserve the bucket-list removal callback. Keep the old
getOpenStatus export solely for the untouched detail page.

No server imports in client code. Define the public discovery response shape in
a client type extending the existing Experience type.

The canonical route wraps the existing detail page without modifying its
implementation; old links remain valid through the redirect.
