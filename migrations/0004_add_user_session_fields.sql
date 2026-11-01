ALTER TABLE users ADD COLUMN session_token_hash TEXT;
ALTER TABLE users ADD COLUMN session_expires_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_session_token_hash
ON users(session_token_hash)
WHERE session_token_hash IS NOT NULL;