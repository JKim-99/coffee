-- Preserve historical records. Their ownership continues to use the legacy email fallback.
-- New inquiries always have a server-assigned member ID.
ALTER TABLE inquiries ADD COLUMN user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_inquiries_member_created
ON inquiries(user_id, created_at DESC) WHERE deleted_at IS NULL;
