import type { TagValue } from "../db/schema";

function getVisibleSpotsQuery(userId: string, tagFilter?: string): {
  sql: string;
  params: string[];
} {
  const params: string[] = [userId, userId];
  let sql = `
    SELECT DISTINCT s.*
    FROM spots s
    LEFT JOIN spot_groups sg ON s.id = sg.spot_id
    LEFT JOIN group_members gm ON sg.group_id = gm.group_id
    WHERE (
      s.visibility = 'public'
      OR (s.visibility = 'private' AND s.created_by = ?)
      OR (s.visibility = 'group' AND gm.user_id = ?)
    )
  `;

  if (tagFilter) {
    sql += `
      AND s.id IN (
        SELECT spot_id FROM spot_tags WHERE tag = ?
      )
    `;
    params.push(tagFilter);
  }

  sql += " ORDER BY s.created_at DESC";

  return { sql, params };
}

function getSpotByIdQuery(spotId: string, userId: string): {
  sql: string;
  params: string[];
} {
  return {
    sql: `
      SELECT DISTINCT s.*
      FROM spots s
      LEFT JOIN spot_groups sg ON s.id = sg.spot_id
      LEFT JOIN group_members gm ON sg.group_id = gm.group_id
      WHERE s.id = ?
        AND (
          s.visibility = 'public'
          OR (s.visibility = 'private' AND s.created_by = ?)
          OR (s.visibility = 'group' AND gm.user_id = ?)
        )
    `,
    params: [spotId, userId, userId],
  };
}

export async function findVisibleSpots(
  db: D1Database,
  userId: string,
  tagFilter?: string,
) {
  const { sql, params } = getVisibleSpotsQuery(userId, tagFilter);
  const { results } = await db.prepare(sql).bind(...params).all();
  return results ?? [];
}

export async function findSpotByIdForUser(
  db: D1Database,
  spotId: string,
  userId: string,
) {
  const { sql, params } = getSpotByIdQuery(spotId, userId);
  return db.prepare(sql).bind(...params).first();
}

export async function findTagsBySpotId(db: D1Database, spotId: string) {
  const { results } = await db
    .prepare("SELECT tag FROM spot_tags WHERE spot_id = ?")
    .bind(spotId)
    .all();
  return (results ?? []).map((t) => t.tag as TagValue);
}

export async function findTagsBySpotIds(db: D1Database, spotIds: string[]) {
  if (spotIds.length === 0) return new Map<string, TagValue[]>();

  const placeholders = spotIds.map(() => "?").join(", ");
  const { results } = await db
    .prepare(`SELECT spot_id, tag FROM spot_tags WHERE spot_id IN (${placeholders})`)
    .bind(...spotIds)
    .all();

  const map = new Map<string, TagValue[]>();
  for (const id of spotIds) {
    map.set(id, []);
  }
  for (const row of results ?? []) {
    const tags = map.get(row.spot_id as string)!;
    tags.push(row.tag as TagValue);
  }
  return map;
}

export async function findSpotByOwner(
  db: D1Database,
  spotId: string,
  userId: string,
) {
  return db
    .prepare("SELECT * FROM spots WHERE id = ? AND created_by = ?")
    .bind(spotId, userId)
    .first();
}

export async function insertSpot(
  db: D1Database,
  spot: {
    id: string;
    name: string;
    description: string | null;
    lat: number;
    lng: number;
    visibility: string;
    createdBy: string;
    createdAt: number;
    updatedAt: number;
  },
) {
  await db
    .prepare(
      `INSERT INTO spots (id, name, description, lat, lng, visibility, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      spot.id,
      spot.name,
      spot.description,
      spot.lat,
      spot.lng,
      spot.visibility,
      spot.createdBy,
      spot.createdAt,
      spot.updatedAt,
    )
    .run();
}

export async function updateSpot(
  db: D1Database,
  spotId: string,
  fields: {
    name?: string;
    description?: string;
    lat?: number;
    lng?: number;
    visibility?: string;
  },
  updatedAt: number,
) {
  await db
    .prepare(
      `UPDATE spots SET
         name = COALESCE(?, name),
         description = COALESCE(?, description),
         lat = COALESCE(?, lat),
         lng = COALESCE(?, lng),
         visibility = COALESCE(?, visibility),
         updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      fields.name ?? null,
      fields.description ?? null,
      fields.lat ?? null,
      fields.lng ?? null,
      fields.visibility ?? null,
      updatedAt,
      spotId,
    )
    .run();
}

export async function deleteSpot(db: D1Database, spotId: string) {
  await db.prepare("DELETE FROM spots WHERE id = ?").bind(spotId).run();
}

export async function insertSpotTags(
  db: D1Database,
  spotId: string,
  tags: TagValue[],
) {
  if (tags.length === 0) return;
  const stmt = db.prepare(
    "INSERT INTO spot_tags (spot_id, tag) VALUES (?, ?)",
  );
  await db.batch(tags.map((tag) => stmt.bind(spotId, tag)));
}

export async function deleteSpotTags(db: D1Database, spotId: string) {
  await db
    .prepare("DELETE FROM spot_tags WHERE spot_id = ?")
    .bind(spotId)
    .run();
}

export async function insertSpotGroup(
  db: D1Database,
  spotId: string,
  groupId: string,
) {
  await db
    .prepare(
      "INSERT OR IGNORE INTO spot_groups (spot_id, group_id) VALUES (?, ?)",
    )
    .bind(spotId, groupId)
    .run();
}

export async function deleteSpotGroup(
  db: D1Database,
  spotId: string,
  groupId: string,
) {
  await db
    .prepare("DELETE FROM spot_groups WHERE spot_id = ? AND group_id = ?")
    .bind(spotId, groupId)
    .run();
}

export async function updateSpotVisibility(
  db: D1Database,
  spotId: string,
  visibility: string,
  updatedAt: number,
) {
  await db
    .prepare("UPDATE spots SET visibility = ?, updated_at = ? WHERE id = ?")
    .bind(visibility, updatedAt, spotId)
    .run();
}
