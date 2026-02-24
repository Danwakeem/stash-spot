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

