# Design

Use a singleton database settings row. Public pricing configuration exposes only
the exchange rate; authenticated admin endpoints expose and edit commission and
exchange audit metadata. Vendor overrides and first-publication timestamps live
on vendors. Stamp the first publication transactionally and never reset it.

Preserve priceAmount as resident LKR and add visitorPriceUsd independently.
Calculate booking snapshots in the existing locked booking transaction from
database prices, settings and authenticated member status. Store counts, unit
prices, exchange rate, applied commission, commission amount and vendor net.
Round the combined total to whole LKR, then round commission and subtract it
from the total to ensure amounts reconcile. Never revise snapshots after creation.

Existing users default to resident and can change their answer in Profile.
Existing published vendors start their introductory clock on migration, because
the historic first-publication date was not recorded. Legacy bookings retain
their original totals and have null snapshots rather than invented commissions.
When no visitor price exists, all guests use the same resident price; visitor
counts remain truthful. With a visitor price and no exchange rate, visitor
bookings fail and public displays show resident pricing only.

Use UTC calendar-month arithmetic with end-of-month clamping for commission
periods. Existing currency codes are not converted or rewritten; change defaults
only. All newly created bookings use LKR explicitly.
