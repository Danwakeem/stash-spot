import { Hono } from "hono";
import type { Env } from "../types";
import { ServiceError } from "../services/errors";
import * as usersService from "../services/users.service";

export const usersRoutes = new Hono<Env>();

function handleError(c: { json: (data: unknown, status: number) => Response }, err: unknown) {
  if (err instanceof ServiceError) {
    return c.json({ error: err.message }, err.status as 400);
  }
  throw err;
}

// GET /users/me — get or create user record after Clerk sign-in
usersRoutes.get("/me", async (c) => {
  const user = await usersService.getOrCreateUser(c.env.DB, c.get("userId"));
  return c.json(user);
});

// PATCH /users/me — update username/avatar
usersRoutes.patch("/me", async (c) => {
  try {
    const body = await c.req.json<{
      username?: string;
      avatar_url?: string;
    }>();
    const user = await usersService.updateUser(c.env.DB, c.get("userId"), body);
    return c.json(user);
  } catch (err) {
    return handleError(c, err);
  }
});
