# Design

Store validated activities as nullable structured JSON on the application/vendor,
not in description prose. Null identifies legacy applications. Store group-size
preferences as a separate listing array, not as capacity or good-for tags.

Approval holds the existing vendor row lock and inserts drafts in the same
transaction as approval. Repeated approval cannot duplicate drafts. No invented
photos, capacity or schedule: these remain unset until the owner edits them.

One shared zod activity schema validates both the browser and server. The server
continues accepting the old payload for compatibility, while the form sends the
new activities array. Public vendor profile endpoints must not expose it.
