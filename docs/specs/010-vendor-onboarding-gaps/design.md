# Design and API contract

- users.mustChangePassword boolean default false. Mark all temporary-password
  creation/reset paths, including users created by an admin. No guessing old
  accounts' historic passwords. Migration identifies existing temporary hashes
  only where a reliable flag exists (none today); flag new issuance going forward.
- Central /api middleware after session, before every route, blocks flagged
  sessions with 403 {code:"PASSWORD_CHANGE_REQUIRED",message,mustChangePassword:true}.
  Only POST /api/auth/logout and POST /api/auth/change-password are exempt.
  Login itself returns the safe user including the flag. No exemption for me.
  Client's shared auth hook recognizes the 403 and redirects to /set-password.
- site_settings singleton id1: showDemoContent false and bookingsOpen false in
  production; development explicitly enables demo content after the migration.
  GET /api/site-config returns those booleans publicly.
  GET/PATCH /api/admin/site-settings uses strict zod and admin guard.
- vendors.isDemo and experiences.isDemo false by default; migration flags vendors
  whose owner email ends @freespirit.com, and their existing listings.
  Public storage queries and booking transaction enforce the flags and settings.
- GET /api/{vendor|admin}/experiences/:id/photos returns photo array.
  POST same path accepts multipart photos (max6 total, each 10MB), returns array.
  PUT same path takes {photoIds:number[]} with complete exact set for reordering.
  DELETE same path /:photoId removes variants and returns updated array.
  POST /api/{vendor|admin}/experiences/:id/duplicate creates a draft after
  validating the copied listing with the existing vendor listing schema.
  Uploaded photos receive independent storage keys; shared static files stay put.
  Photo shape: {id,experienceId,imageUrl,sortOrder,storageKey:null|string,
  srcSet:string|null}. Existing static images remain supported.
  Public GET /api/experiences/:id/photos returns the visible listing's photos.
  PublicExperience.photoSrcSet is optional string|null, for the uploaded cover.
  Public image bytes served from /api/listing-images/:photoId/:width.webp with
  width 400/800/1600, visibility enforced. Object keys listing-photos/<uuid>/<width>.webp.
- Object storage adapter never falls back to local files or private document
  storage; unavailable storage returns an explicit 503.
- POST /api/experiences/:id/notify accepts {email,name?:string}; normalizes email,
  validates published/demo visibility, inserts once with a unique listing/email
  index and returns {ok:true}. No email sending.
- GET /api/admin/waiting-list returns {counts:[{experienceId,title,count}],
  entries:[{id,experienceId,title,email,name,createdAt}]}.
  GET /api/admin/waiting-list/export returns formula-safe CSV.
- New admin route /admin/waiting-list. Existing admin table patterns and role gate.
- VENDOR_TERMS_VERSION becomes 0.9, terms agreement text/timestamp remains stored
  in the application description block. Other draft headings only replace the
  existing em dash with a comma to satisfy the no-em-dash copy requirement.
