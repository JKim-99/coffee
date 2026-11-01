CREATE TABLE IF NOT EXISTS favorite_menus (
  user_id TEXT NOT NULL,
  menu_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, menu_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_favorite_menus_user_created
ON favorite_menus(user_id, created_at DESC);