# Structured application activities

Store proposed activities in a nullable vendor JSON column and create draft
listings during approval, atomically with the existing approval transaction.

Why: each activity has independent prices and group preferences. Description
text is not a safe or reliable persistence format for structured activity data.
Null preserves legacy applications without guessing activities from old prices.

Typical group preferences use a new listing array, not an invented maximum
capacity. Photos, duration and schedule must be completed before publishing.
