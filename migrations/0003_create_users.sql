CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 2 AND 30),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(email) BETWEEN 3 AND 254),
  password_hash TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('female', 'male', 'undisclosed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);