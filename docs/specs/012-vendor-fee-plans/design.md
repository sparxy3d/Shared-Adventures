# Design and API

Three nullable vendor columns hold introductory rate/months and standard rate.
Null means inherit global configuration. Existing flat overrides remain effective
unless a new three-part plan is saved, which clears the legacy flat override.

PATCH /api/admin/vendors/:id/commission accepts either its existing flat payload
or {introductoryRate, introductoryMonths, standardRate}. POST approve accepts
optional {feePlan: {introductoryRate, introductoryMonths, standardRate}}; omission
snapshots global defaults. Approval and fee persistence share one transaction.

Dashboard commission data adds introductoryRate, standardRate, introductoryMonths,
introductoryNotStarted. Both dashboard and new bookings use the same helper.
Existing booking monetary snapshots are never updated.
