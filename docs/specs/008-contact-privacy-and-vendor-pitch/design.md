# Design
Use a shared, pure contact policy for client/server consistency. Restrict Google URLs by parsed protocol, hostname and Google Maps path. Store the optional Google link in the existing application description block. Keep legacy contact metadata unchanged when saving the business profile, but do not display it.

Validate only supplied listing fields on updates so unrelated status changes do not rewrite legacy prose. Keep existing guards, ownership checks, price handling and persistence.
