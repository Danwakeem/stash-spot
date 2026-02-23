import { hc } from "hono/client";
import type { AppType } from "../../api-types";

export type { AppType };

export function createApiClient(baseUrl: string, token?: string) {
  return hc<AppType>(baseUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// Re-export the VALID_TAGS constant for consumers
export { VALID_TAGS } from "../../api-types";

// Re-export types for consumers
export type {
  User,
  Spot,
  SpotWithTags,
  Group,
  GroupMember,
  TagValue,
} from "../../api-types";
