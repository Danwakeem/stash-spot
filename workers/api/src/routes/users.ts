import { Hono } from "hono";
import type { Env } from "../types";

export const usersRoutes = new Hono<Env>();

// GET /users/me — get or create user record after Clerk sign-in
usersRoutes.get("/me", async (c) => {
  const userId = c.get("userId");

  let user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(userId)
    .first();

  if (!user) {
    // Auto-create user record on first sign-in
    await c.env.DB.prepare(
      "INSERT INTO users (id, username) VALUES (?, ?)"
    )
      .bind(userId, `user_${userId.slice(-8)}`)
      .run();

    user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId)
      .first();
  }

  return c.json(user);
});

// PATCH /users/me — update username/avatar
usersRoutes.patch("/me", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    username?: string;
    avatar_url?: string;
  }>();

  if (!body.username && !body.avatar_url) {
    return c.json({ error: "Nothing to update" }, 400);
  }

  await c.env.DB.prepare(
    `UPDATE users SET
       username = COALESCE(?, username),
       avatar_url = COALESCE(?, avatar_url)
     WHERE id = ?`
  )
    .bind(body.username ?? null, body.avatar_url ?? null, userId)
    .run();

  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(userId)
    .first();

  return c.json(user);
});
