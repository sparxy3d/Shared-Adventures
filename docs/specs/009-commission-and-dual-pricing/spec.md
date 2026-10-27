# Commission and dual pricing

Status: approved

The approved Stage 2 request adds editable introductory and standard commission
settings, per-vendor overrides and immutable booking financial snapshots; explicit
resident LKR and optional visitor USD prices; an audited USD/LKR display conversion;
resident status on signup/profile; and mixed-group booking breakdowns. All charges
and settlement amounts remain whole LKR. USD prices are whole display dollars only.

Seed code and ENABLE_SEED are out of scope. Apply reviewed SQL to development only.
Madushan applies the same migration to external production before deployment.
No gateway work, publishing or production writes.

Verify introductory/standard/override selection, immutable snapshots, mixed total
of LKR 11,000, tampered browser total, missing exchange rate, validation and role
guards. Capture editor, cards for both member types, booking breakdown, settings
and vendor commission at desktop and phone widths.
