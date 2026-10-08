# Vendor application placeholders and disclosure

Accepted for the Stage 4 prototype.

**Decision:** Anonymous applications create pending vendor records linked to
non-authenticating placeholder member accounts. Structured application details
remain in the existing description and address column. Only placeholder approval
generates and returns a temporary password once. Existing owners retain passwords.

**Why:** The user explicitly forbids schema changes and requires anonymous
applications with manually approved vendor access.

**Decision:** Vendor member contact fields are null except on confirmed bookings.
Decline reason and note share vendorNote; cancellation uses existing spot release.

**Why:** Disclose contacts only after confirmation and preserve existing inventory
and tenancy boundaries without a new notification or notes schema.
