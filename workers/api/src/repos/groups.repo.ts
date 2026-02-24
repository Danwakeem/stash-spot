export async function findGroupsByUserId(db: D1Database, userId: string) {
  const { results } = await db
    .prepare(
      `SELECT g.* FROM groups g
       INNER JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ?
       ORDER BY g.created_at DESC`,
    )
    .bind(userId)
    .all();
  return results ?? [];
}

export async function insertGroupWithOwner(
  db: D1Database,
  group: { id: string; name: string; inviteCode: string },
  ownerId: string,
) {
  await db.batch([
    db
      .prepare(
        "INSERT INTO groups (id, name, invite_code, created_by) VALUES (?, ?, ?, ?)",
      )
      .bind(group.id, group.name, group.inviteCode, ownerId),
    db
      .prepare(
        "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'owner')",
      )
      .bind(group.id, ownerId),
  ]);
}

export async function findGroupByInviteCode(
  db: D1Database,
  inviteCode: string,
) {
  return db
    .prepare("SELECT id, name FROM groups WHERE invite_code = ?")
    .bind(inviteCode)
    .first();
}

export async function findMembership(
  db: D1Database,
  groupId: string,
  userId: string,
) {
  return db
    .prepare(
      "SELECT group_id, role FROM group_members WHERE group_id = ? AND user_id = ?",
    )
    .bind(groupId, userId)
    .first();
}

export async function insertGroupMember(
  db: D1Database,
  groupId: string,
  userId: string,
  role: "owner" | "member",
) {
  await db
    .prepare(
      "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)",
    )
    .bind(groupId, userId, role)
    .run();
}

export async function findGroupMembers(db: D1Database, groupId: string) {
  const { results } = await db
    .prepare(
      `SELECT u.id, u.username, u.avatar_url, gm.role, gm.joined_at
       FROM group_members gm
       INNER JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY gm.joined_at ASC`,
    )
    .bind(groupId)
    .all();
  return results ?? [];
}

export async function deleteGroupMember(
  db: D1Database,
  groupId: string,
  userId: string,
) {
  await db
    .prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?")
    .bind(groupId, userId)
    .run();
}
