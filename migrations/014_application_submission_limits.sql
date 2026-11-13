CREATE TABLE application_submission_attempts (
  id serial PRIMARY KEY,
  scope text NOT NULL CHECK (scope IN ('ip', 'email')),
  key_hash text NOT NULL CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  attempted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX application_attempt_key_time_idx
  ON application_submission_attempts (scope, key_hash, attempted_at);
CREATE INDEX application_attempt_expiry_idx
  ON application_submission_attempts (attempted_at);
