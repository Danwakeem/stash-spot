import { Hono } from "hono";
import type { Env } from "../types";
import type { TagValue } from "../db/schema";
import { ServiceError } from "../services/errors";
import * as spotsService from "../services/spots.service";

export const spotsRoutes = new Hono<Env>();

function handleError(c: { json: (data: unknown, status: number) => Response }, err: unknown) {
  if (err instanceof ServiceError) {
    return c.json({ error: err.message }, err.status as 400);
  }
  throw err;
}

// GET /spots — list spots visible to the authenticated user
spotsRoutes.get("/", async (c) => {
  try {
    const spots = await spotsService.listSpots(
      c.env.DB,
      c.get("userId"),
      c.req.query("tag"),
    );
    return c.json({ spots });
  } catch (err) {
    return handleError(c, err);
  }
});

// GET /spots/:id — get a single spot with access check
spotsRoutes.get("/:id", async (c) => {
  try {
    const spot = await spotsService.getSpot(
      c.env.DB,
      c.req.param("id"),
      c.get("userId"),
    );
    return c.json(spot);
  } catch (err) {
    return handleError(c, err);
  }
});

// POST /spots — create a spot
spotsRoutes.post("/", async (c) => {
  try {
    const body = await c.req.json<{
      name: string;
      description?: string;
      lat: number;
      lng: number;
      visibility: "private" | "group" | "public";
      tags?: TagValue[];
    }>();
    const result = await spotsService.createSpot(c.env.DB, c.get("userId"), body);
    return c.json(result, 201);
  } catch (err) {
    return handleError(c, err);
  }
});

// PATCH /spots/:id — update a spot (owner only)
spotsRoutes.patch("/:id", async (c) => {
  try {
    const body = await c.req.json<{
      name?: string;
      description?: string;
      lat?: number;
      lng?: number;
      visibility?: "private" | "group" | "public";
      tags?: TagValue[];
    }>();
    const result = await spotsService.updateSpot(
      c.env.DB,
      c.req.param("id"),
      c.get("userId"),
      body,
    );
    return c.json(result);
  } catch (err) {
    return handleError(c, err);
  }
});

// DELETE /spots/:id — delete a spot (owner only)
spotsRoutes.delete("/:id", async (c) => {
  try {
    const result = await spotsService.deleteSpot(
      c.env.DB,
      c.req.param("id"),
      c.get("userId"),
    );
    return c.json(result);
  } catch (err) {
    return handleError(c, err);
  }
});

// POST /spots/:id/groups — share a spot to a group
spotsRoutes.post("/:id/groups", async (c) => {
  try {
    const { group_id } = await c.req.json<{ group_id: string }>();
    const result = await spotsService.shareSpotToGroup(
      c.env.DB,
      c.req.param("id"),
      group_id,
      c.get("userId"),
    );
    return c.json(result);
  } catch (err) {
    return handleError(c, err);
  }
});

// DELETE /spots/:id/groups/:groupId — unshare
spotsRoutes.delete("/:id/groups/:groupId", async (c) => {
  try {
    const result = await spotsService.unshareSpotFromGroup(
      c.env.DB,
      c.req.param("id"),
      c.req.param("groupId"),
      c.get("userId"),
    );
    return c.json(result);
  } catch (err) {
    return handleError(c, err);
  }
});
