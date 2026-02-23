import { Hono } from "hono";
import { nanoid } from "nanoid";
import type { Env } from "../types";
import {
  VALID_TAGS,
  type TagValue,
  type SpotWithTags,
  getVisibleSpotsQuery,
  getSpotByIdQuery,
} from "../db/schema";

export const spotsRoutes = new Hono<Env>();

// GET /spots — list spots visible to the authenticated user
spotsRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const tagFilter = c.req.query("tag");

  if (tagFilter && !VALID_TAGS.includes(tagFilter as TagValue)) {
    return c.json({ error: "Invalid tag filter" }, 400);
  }

  const { sql, params } = getVisibleSpotsQuery(userId, tagFilter);
  const { results: spots } = await c.env.DB.prepare(sql)
    .bind(...params)
    .all();

  // Fetch tags for each spot
  const spotsWithTags: SpotWithTags[] = await Promise.all(
    (spots ?? []).map(async (spot) => {
      const { results: tags } = await c.env.DB.prepare(
        "SELECT tag FROM spot_tags WHERE spot_id = ?"
      )
        .bind(spot.id)
        .all();
      return {
        ...(spot as unknown as SpotWithTags),
        tags: (tags ?? []).map((t) => t.tag as TagValue),
      };
    })
  );

  return c.json({ spots: spotsWithTags });
});

// GET /spots/:id — get a single spot with access check
spotsRoutes.get("/:id", async (c) => {
  const userId = c.get("userId");
  const spotId = c.req.param("id");

  const { sql, params } = getSpotByIdQuery(spotId, userId);
  const spot = await c.env.DB.prepare(sql).bind(...params).first();

  if (!spot) {
    return c.json({ error: "Spot not found" }, 404);
  }

  const { results: tags } = await c.env.DB.prepare(
    "SELECT tag FROM spot_tags WHERE spot_id = ?"
  )
    .bind(spotId)
    .all();

  return c.json({
    ...spot,
    tags: (tags ?? []).map((t) => t.tag as TagValue),
  });
});

// POST /spots — create a spot
spotsRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    name: string;
    description?: string;
    lat: number;
    lng: number;
    visibility: "private" | "group" | "public";
    tags?: TagValue[];
  }>();

  if (!body.name || body.lat == null || body.lng == null || !body.visibility) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  if (!["private", "group", "public"].includes(body.visibility)) {
    return c.json({ error: "Invalid visibility" }, 400);
  }

  if (body.tags) {
    for (const tag of body.tags) {
      if (!VALID_TAGS.includes(tag)) {
        return c.json({ error: `Invalid tag: ${tag}` }, 400);
      }
    }
  }

  const id = nanoid();
  const now = Math.floor(Date.now() / 1000);

  await c.env.DB.prepare(
    `INSERT INTO spots (id, name, description, lat, lng, visibility, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.name,
      body.description ?? null,
      body.lat,
      body.lng,
      body.visibility,
      userId,
      now,
      now
    )
    .run();

  // Insert tags
  if (body.tags && body.tags.length > 0) {
    const tagStmt = c.env.DB.prepare(
      "INSERT INTO spot_tags (spot_id, tag) VALUES (?, ?)"
    );
    await c.env.DB.batch(body.tags.map((tag) => tagStmt.bind(id, tag)));
  }

  return c.json({ id, name: body.name }, 201);
});

// PATCH /spots/:id — update a spot (owner only)
spotsRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const spotId = c.req.param("id");

  const existing = await c.env.DB.prepare(
    "SELECT * FROM spots WHERE id = ? AND created_by = ?"
  )
    .bind(spotId, userId)
    .first();

  if (!existing) {
    return c.json({ error: "Spot not found or not authorized" }, 404);
  }

  const body = await c.req.json<{
    name?: string;
    description?: string;
    lat?: number;
    lng?: number;
    visibility?: "private" | "group" | "public";
    tags?: TagValue[];
  }>();

  if (body.visibility && !["private", "group", "public"].includes(body.visibility)) {
    return c.json({ error: "Invalid visibility" }, 400);
  }

  if (body.tags) {
    for (const tag of body.tags) {
      if (!VALID_TAGS.includes(tag)) {
        return c.json({ error: `Invalid tag: ${tag}` }, 400);
      }
    }
  }

  const now = Math.floor(Date.now() / 1000);

  await c.env.DB.prepare(
    `UPDATE spots SET
       name = COALESCE(?, name),
       description = COALESCE(?, description),
       lat = COALESCE(?, lat),
       lng = COALESCE(?, lng),
       visibility = COALESCE(?, visibility),
       updated_at = ?
     WHERE id = ?`
  )
    .bind(
      body.name ?? null,
      body.description ?? null,
      body.lat ?? null,
      body.lng ?? null,
      body.visibility ?? null,
      now,
      spotId
    )
    .run();

  // Replace tags if provided
  if (body.tags) {
    await c.env.DB.prepare("DELETE FROM spot_tags WHERE spot_id = ?")
      .bind(spotId)
      .run();

    if (body.tags.length > 0) {
      const tagStmt = c.env.DB.prepare(
        "INSERT INTO spot_tags (spot_id, tag) VALUES (?, ?)"
      );
      await c.env.DB.batch(body.tags.map((tag) => tagStmt.bind(spotId, tag)));
    }
  }

  return c.json({ id: spotId, updated: true });
});

// DELETE /spots/:id — delete a spot (owner only)
spotsRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const spotId = c.req.param("id");

  const existing = await c.env.DB.prepare(
    "SELECT id FROM spots WHERE id = ? AND created_by = ?"
  )
    .bind(spotId, userId)
    .first();

  if (!existing) {
    return c.json({ error: "Spot not found or not authorized" }, 404);
  }

  await c.env.DB.prepare("DELETE FROM spots WHERE id = ?").bind(spotId).run();

  return c.json({ deleted: true });
});

// POST /spots/:id/groups — share a spot to a group
spotsRoutes.post("/:id/groups", async (c) => {
  const userId = c.get("userId");
  const spotId = c.req.param("id");
  const { group_id } = await c.req.json<{ group_id: string }>();

  // Verify spot ownership
  const spot = await c.env.DB.prepare(
    "SELECT id, visibility FROM spots WHERE id = ? AND created_by = ?"
  )
    .bind(spotId, userId)
    .first();

  if (!spot) {
    return c.json({ error: "Spot not found or not authorized" }, 404);
  }

  // Verify user is a member of the group
  const membership = await c.env.DB.prepare(
    "SELECT group_id FROM group_members WHERE group_id = ? AND user_id = ?"
  )
    .bind(group_id, userId)
    .first();

  if (!membership) {
    return c.json({ error: "Not a member of this group" }, 403);
  }

  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO spot_groups (spot_id, group_id) VALUES (?, ?)"
  )
    .bind(spotId, group_id)
    .run();

  // Update visibility to group if it was private
  if (spot.visibility === "private") {
    await c.env.DB.prepare(
      "UPDATE spots SET visibility = 'group', updated_at = ? WHERE id = ?"
    )
      .bind(Math.floor(Date.now() / 1000), spotId)
      .run();
  }

  return c.json({ shared: true });
});

// DELETE /spots/:id/groups/:groupId — unshare
spotsRoutes.delete("/:id/groups/:groupId", async (c) => {
  const userId = c.get("userId");
  const spotId = c.req.param("id");
  const groupId = c.req.param("groupId");

  // Verify spot ownership
  const spot = await c.env.DB.prepare(
    "SELECT id FROM spots WHERE id = ? AND created_by = ?"
  )
    .bind(spotId, userId)
    .first();

  if (!spot) {
    return c.json({ error: "Spot not found or not authorized" }, 404);
  }

  await c.env.DB.prepare(
    "DELETE FROM spot_groups WHERE spot_id = ? AND group_id = ?"
  )
    .bind(spotId, groupId)
    .run();

  return c.json({ unshared: true });
});
