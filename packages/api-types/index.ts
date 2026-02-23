// Re-export types and constants from the worker so the API client
// can reference them without importing the full worker code.
export type { AppType } from "../../workers/api/src/index";
export { VALID_TAGS } from "../../workers/api/src/db/schema";
export type {
  User,
  Spot,
  SpotWithTags,
  Group,
  GroupMember,
  TagValue,
} from "../../workers/api/src/db/schema";
