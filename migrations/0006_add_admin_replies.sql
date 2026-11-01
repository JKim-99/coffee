ALTER TABLE inquiries ADD COLUMN reply TEXT;
ALTER TABLE inquiries ADD COLUMN replied_at TEXT;
ALTER TABLE inquiries ADD COLUMN email_status TEXT NOT NULL DEFAULT 'not_sent';
ALTER TABLE inquiries ADD COLUMN email_error TEXT;
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1));
ALTER TABLE users ADD COLUMN admin_session_hash TEXT;
ALTER TABLE users ADD COLUMN admin_session_expires_at TEXT;