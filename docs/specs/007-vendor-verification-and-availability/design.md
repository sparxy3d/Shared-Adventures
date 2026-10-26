# Design

Documents use a separate PostgreSQL table with bounded bytea contents. No files are written to the public directory, no object URLs exist, and metadata reads never select contents. Admin GET returns validated MIME, attachment disposition, nosniff and private/no-store headers. Deletion removes contents while retaining document type, deleting admin and deletion timestamp.

Multipart parsing is limited to three files of 10 MiB, a single JSON application field, and known document field names. Both claimed MIME/extension and file signature are validated before persistence. Application and documents are committed in one transaction, including anonymous placeholder users.

Taking bookings defaults true to preserve existing vendors' behaviour. It is independent of admin verification status. Vendor toggle and booking creation lock the same vendor row to serialize offline transitions with requests. Booking creation and spot reservation commit together.

No startup migrations. A checked-in SQL migration is applied manually to development only. Madushan applies the same SQL to external Neon production before deploying compatible code.
