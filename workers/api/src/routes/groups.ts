import { Hono } from "hono";
import type { Env } from "../types";
import { ServiceError } from "../services/errors";
import * as groupsService from "../services/groups.service";

export const groupsRoutes = new Hono<Env>();

function handleError(c: { json: (data: unknown, status: number) => Response }, err: unknown) {
  if (err instanceof ServiceError) {
    return c.json({ error: err.message }, err.status as 400);
  }
  throw err;
}

// GET /groups — list groups the user belongs to
groupsRoutes.get("/", async (c) => {
  const groups = await groupsService.listGroups(c.env.DB, c.get("userId"));
  return c.json({ groups });
});

// POST /groups — create a group
groupsRoutes.post("/", async (c) => {
  try {
    const { name } = await c.req.json<{ name: string }>();
    const result = await groupsService.createGroup(c.env.DB, c.get("userId"), name);
    return c.json(result, 201);
  } catch (err) {
    return handleError(c, err);
  }
});

// POST /groups/join — join via invite code
groupsRoutes.post("/join", async (c) => {
  try {
    const { invite_code } = await c.req.json<{ invite_code: string }>();
    const result = await groupsService.joinGroup(c.env.DB, c.get("userId"), invite_code);
    return c.json(result);
  } catch (err) {
    return handleError(c, err);
  }
});

// GET /groups/:id/members — list members
groupsRoutes.get("/:id/members", async (c) => {
  try {
    const members = await groupsService.listGroupMembers(
      c.env.DB,
      c.req.param("id"),
      c.get("userId"),
    );
    return c.json({ members });
  } catch (err) {
    return handleError(c, err);
  }
});

// DELETE /groups/:id/members/:userId — remove member (owner only)
groupsRoutes.delete("/:id/members/:userId", async (c) => {
  try {
    const result = await groupsService.removeMember(
      c.env.DB,
      c.req.param("id"),
      c.req.param("userId"),
      c.get("userId"),
    );
    return c.json(result);
  } catch (err) {
    return handleError(c, err);
  }
});
