export async function findUserById(db: D1Database, userId: string) {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
}

export async function insertUser(
  db: D1Database,
  userId: string,
  username: string,
) {
  await db
    .prepare("INSERT INTO users (id, username) VALUES (?, ?)")
    .bind(userId, username)
    .run();
}

export async function updateUser(
  db: D1Database,
  userId: string,
  fields: { username?: string; avatar_url?: string },
) {
  await db
    .prepare(
      `UPDATE users SET
         username = COALESCE(?, username),
         avatar_url = COALESCE(?, avatar_url)
       WHERE id = ?`,
    )
    .bind(fields.username ?? null, fields.avatar_url ?? null, userId)
    .run();

  return db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
}
