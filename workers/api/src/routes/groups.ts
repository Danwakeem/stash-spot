import { Hono } from "hono";
import { nanoid } from "nanoid";
import type { Env } from "../types";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SK8-${code.slice(0, 3)}${code.slice(3)}`;
}

export const groupsRoutes = new Hono<Env>();

// GET /groups — list groups the user belongs to
groupsRoutes.get("/", async (c) => {
  const userId = c.get("userId");

  const { results } = await c.env.DB.prepare(
    `SELECT g.* FROM groups g
     INNER JOIN group_members gm ON g.id = gm.group_id
     WHERE gm.user_id = ?
     ORDER BY g.created_at DESC`
  )
    .bind(userId)
    .all();

  return c.json({ groups: results ?? [] });
});

// POST /groups — create a group
groupsRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const { name } = await c.req.json<{ name: string }>();

  if (!name) {
    return c.json({ error: "Group name is required" }, 400);
  }

  const id = nanoid();
  const inviteCode = generateInviteCode();

  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO groups (id, name, invite_code, created_by) VALUES (?, ?, ?, ?)"
    ).bind(id, name, inviteCode, userId),
    c.env.DB.prepare(
      "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'owner')"
    ).bind(id, userId),
  ]);

  return c.json({ id, name, invite_code: inviteCode }, 201);
});

// POST /groups/join — join via invite code
groupsRoutes.post("/join", async (c) => {
  const userId = c.get("userId");
  const { invite_code } = await c.req.json<{ invite_code: string }>();

  if (!invite_code) {
    return c.json({ error: "Invite code is required" }, 400);
  }

  const group = await c.env.DB.prepare(
    "SELECT id, name FROM groups WHERE invite_code = ?"
  )
    .bind(invite_code)
    .first();

  if (!group) {
    return c.json({ error: "Invalid invite code" }, 404);
  }

  // Check if already a member
  const existing = await c.env.DB.prepare(
    "SELECT group_id FROM group_members WHERE group_id = ? AND user_id = ?"
  )
    .bind(group.id, userId)
    .first();

  if (existing) {
    return c.json({ error: "Already a member" }, 409);
  }

  await c.env.DB.prepare(
    "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')"
  )
    .bind(group.id, userId)
    .run();

  return c.json({ group_id: group.id, name: group.name, joined: true });
});

// GET /groups/:id/members — list members
groupsRoutes.get("/:id/members", async (c) => {
  const userId = c.get("userId");
  const groupId = c.req.param("id");

  // Verify the requester is a member
  const membership = await c.env.DB.prepare(
    "SELECT group_id FROM group_members WHERE group_id = ? AND user_id = ?"
  )
    .bind(groupId, userId)
    .first();

  if (!membership) {
    return c.json({ error: "Not a member of this group" }, 403);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.avatar_url, gm.role, gm.joined_at
     FROM group_members gm
     INNER JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = ?
     ORDER BY gm.joined_at ASC`
  )
    .bind(groupId)
    .all();

  return c.json({ members: results ?? [] });
});

// DELETE /groups/:id/members/:userId — remove member (owner only)
groupsRoutes.delete("/:id/members/:userId", async (c) => {
  const requesterId = c.get("userId");
  const groupId = c.req.param("id");
  const targetUserId = c.req.param("userId");

  // Verify requester is the owner
  const ownership = await c.env.DB.prepare(
    "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?"
  )
    .bind(groupId, requesterId)
    .first();

  if (!ownership || ownership.role !== "owner") {
    return c.json({ error: "Only group owners can remove members" }, 403);
  }

  // Cannot remove yourself as owner
  if (targetUserId === requesterId) {
    return c.json({ error: "Cannot remove yourself as owner" }, 400);
  }

  await c.env.DB.prepare(
    "DELETE FROM group_members WHERE group_id = ? AND user_id = ?"
  )
    .bind(groupId, targetUserId)
    .run();

  return c.json({ removed: true });
});
