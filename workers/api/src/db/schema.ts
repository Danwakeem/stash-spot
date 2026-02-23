export interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: number;
}

export interface Spot {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  visibility: "private" | "group" | "public";
  created_by: string;
  created_at: number;
  updated_at: number;
}

export interface SpotWithTags extends Spot {
  tags: SpotTag["tag"][];
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: number;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: number;
}

export interface SpotGroup {
  spot_id: string;
  group_id: string;
}

export const VALID_TAGS = [
  "ledge",
  "rail",
  "gap",
  "stairs",
  "manual_pad",
  "transition",
  "other",
] as const;

export type TagValue = (typeof VALID_TAGS)[number];

export interface SpotTag {
  spot_id: string;
  tag: TagValue;
}

// Query helpers

export function getVisibleSpotsQuery(userId: string, tagFilter?: string): {
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

export function getSpotByIdQuery(spotId: string, userId: string): {
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
