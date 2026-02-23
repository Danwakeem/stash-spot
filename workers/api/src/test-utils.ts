import { Hono } from "hono";
import type { Env } from "./types";
import { spotsRoutes } from "./routes/spots";
import { groupsRoutes } from "./routes/groups";
import { usersRoutes } from "./routes/users";

/**
 * Creates a test app instance that bypasses Clerk auth
 * and injects a mock userId into the context.
 */
export function createTestApp(options: { userId: string }) {
  const app = new Hono<Env>();

  // Mock auth middleware — inject userId directly
  app.use("*", async (c, next) => {
    c.set("userId", options.userId);
    await next();
  });

  app.route("/api/v1/spots", spotsRoutes);
  app.route("/api/v1/groups", groupsRoutes);
  app.route("/api/v1/users", usersRoutes);

  return app;
}

/**
 * Seeds the test D1 database with fixture data.
 */
export async function seedTestDb(db: D1Database) {
  await db.batch([
    db.prepare(
      "INSERT INTO users (id, username) VALUES ('user_alice', 'alice_sk8s')"
    ),
    db.prepare(
      "INSERT INTO users (id, username) VALUES ('user_bob', 'bob_grinds')"
    ),

    // Public spot by alice
    db.prepare(
      `INSERT INTO spots (id, name, lat, lng, visibility, created_by)
       VALUES ('spot_pub', 'EMB', 37.7878, -122.4, 'public', 'user_alice')`
    ),
    db.prepare(
      "INSERT INTO spot_tags (spot_id, tag) VALUES ('spot_pub', 'ledge')"
    ),
    db.prepare(
      "INSERT INTO spot_tags (spot_id, tag) VALUES ('spot_pub', 'stairs')"
    ),

    // Private spot by bob
    db.prepare(
      `INSERT INTO spots (id, name, lat, lng, visibility, created_by)
       VALUES ('spot_priv', 'Secret Hubba', 37.791, -122.403, 'private', 'user_bob')`
    ),
    db.prepare(
      "INSERT INTO spot_tags (spot_id, tag) VALUES ('spot_priv', 'ledge')"
    ),

    // Group spot by alice
    db.prepare(
      `INSERT INTO spots (id, name, lat, lng, visibility, created_by)
       VALUES ('spot_grp', 'Crew Rail', 37.789, -122.401, 'group', 'user_alice')`
    ),
    db.prepare(
      "INSERT INTO spot_tags (spot_id, tag) VALUES ('spot_grp', 'rail')"
    ),

    // Group
    db.prepare(
      "INSERT INTO groups (id, name, invite_code, created_by) VALUES ('grp_001', 'SF Crew', 'SK8-SF1', 'user_alice')"
    ),
    db.prepare(
      "INSERT INTO group_members (group_id, user_id, role) VALUES ('grp_001', 'user_alice', 'owner')"
    ),
    db.prepare(
      "INSERT INTO group_members (group_id, user_id, role) VALUES ('grp_001', 'user_bob', 'member')"
    ),
    db.prepare(
      "INSERT INTO spot_groups (spot_id, group_id) VALUES ('spot_grp', 'grp_001')"
    ),
  ]);
}

/**
 * Applies the initial migration to a test D1 database.
 */
export async function applyMigrations(db: D1Database) {
  const migration = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      avatar_url TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS spots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      visibility TEXT NOT NULL CHECK (visibility IN ('private', 'group', 'public')),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'member')) DEFAULT 'member',
      joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS spot_groups (
      spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      PRIMARY KEY (spot_id, group_id)
    );

    CREATE TABLE IF NOT EXISTS spot_tags (
      spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
      tag TEXT NOT NULL CHECK (tag IN ('ledge', 'rail', 'gap', 'stairs', 'manual_pad', 'transition', 'other')),
      PRIMARY KEY (spot_id, tag)
    );

    CREATE INDEX IF NOT EXISTS idx_spots_created_by ON spots(created_by);
    CREATE INDEX IF NOT EXISTS idx_spots_visibility ON spots(visibility);
    CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_spot_groups_group ON spot_groups(group_id);
    CREATE INDEX IF NOT EXISTS idx_spot_tags_tag ON spot_tags(tag);
  `;

  const statements = migration
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sql of statements) {
    await db.prepare(sql).run();
  }
}
