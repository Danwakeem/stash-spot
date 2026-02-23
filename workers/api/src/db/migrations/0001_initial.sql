-- migrations/0001_initial.sql

CREATE TABLE users (
  id TEXT PRIMARY KEY,          -- Clerk user ID
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE spots (
  id TEXT PRIMARY KEY,          -- nanoid
  name TEXT NOT NULL,
  description TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'group', 'public')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE groups (
  id TEXT PRIMARY KEY,          -- nanoid
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE group_members (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE spot_groups (
  spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (spot_id, group_id)
);

CREATE TABLE spot_tags (
  spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  tag TEXT NOT NULL CHECK (tag IN ('ledge', 'rail', 'gap', 'stairs', 'manual_pad', 'transition', 'other')),
  PRIMARY KEY (spot_id, tag)
);

-- Indexes
CREATE INDEX idx_spots_created_by ON spots(created_by);
CREATE INDEX idx_spots_visibility ON spots(visibility);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_spot_groups_group ON spot_groups(group_id);
CREATE INDEX idx_spot_tags_tag ON spot_tags(tag);
