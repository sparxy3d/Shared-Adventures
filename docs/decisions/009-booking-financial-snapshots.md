# Financial snapshots and explicit dual pricing

Decision: resident prices stay in price_amount (whole LKR); visitor prices occupy
visitor_price_usd (whole USD). Currency codes never select a price. USD is display
only and new booking settlement is always LKR.

Why: converting a generic amount/currency pair previously caused a hundredfold
price error. Explicit fields prevent ambiguity. Snapshotting all financial inputs
and outputs at request creation prevents later policy edits changing obligations.

Legacy bookings are not retroactively assigned a commission. Existing accounts
default to resident until edited, and existing published vendors receive a new
introductory period starting at migration because historic publication is unknown.
Calendar-month periods clamp to the last valid day, and vendor overrides take
precedence over the introductory schedule.
