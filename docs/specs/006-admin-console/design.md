# Stage 6 design

Admin prefix guard remains the authorization boundary. New handlers validate
inputs and route IDs, then use existing storage or narrowly added projections.
No HTTP/SQL mixed concerns. Session mutation delegates to stage5 insert-only and
booked-session-safe methods. Approval metadata lives in existing description text.

Admin shell composes shared table, dialog, credential dialog and state components.
Independent route pages use TanStack Query URL keys; writes invalidate admin/public/
vendor/member keys. Credential values live only in local dialog state and are
cleared on close; never persist/copy to logs or documentation.

Stage5 editor/schedule/stats gain explicit optional admin-context props; vendor
defaults/guards remain unchanged. Admin contexts call only admin endpoints and
scope listings/bookings by the selected business. No masquerading as a vendor.
Existing old admin component is replaced rather than rendered alongside new pages.
