import { nanoid } from "nanoid";
import { VALID_TAGS, type TagValue, type SpotWithTags } from "../db/schema";
import { ServiceError } from "./errors";
import * as spotsRepo from "../repos/spots.repo";
import * as groupsRepo from "../repos/groups.repo";

export async function listSpots(
  db: D1Database,
  userId: string,
  tagFilter?: string,
): Promise<SpotWithTags[]> {
  if (tagFilter && !VALID_TAGS.includes(tagFilter as TagValue)) {
    throw ServiceError.validation("Invalid tag filter");
  }

  const spots = await spotsRepo.findVisibleSpots(db, userId, tagFilter);
  const spotIds = spots.map((s) => s.id as string);
  const tagsMap = await spotsRepo.findTagsBySpotIds(db, spotIds);

  return spots.map((spot) => ({
    ...(spot as unknown as SpotWithTags),
    tags: tagsMap.get(spot.id as string) ?? [],
  }));
}

export async function getSpot(
  db: D1Database,
  spotId: string,
  userId: string,
) {
  const spot = await spotsRepo.findSpotByIdForUser(db, spotId, userId);
  if (!spot) {
    throw ServiceError.notFound("Spot not found");
  }

  const tags = await spotsRepo.findTagsBySpotId(db, spotId);
  return { ...spot, tags };
}

function validateTags(tags: TagValue[]) {
  for (const tag of tags) {
    if (!VALID_TAGS.includes(tag)) {
      throw ServiceError.validation(`Invalid tag: ${tag}`);
    }
  }
}

export async function createSpot(
  db: D1Database,
  userId: string,
  input: {
    name: string;
    description?: string;
    lat: number;
    lng: number;
    visibility: "private" | "group" | "public";
    tags?: TagValue[];
  },
) {
  if (!input.name || input.lat == null || input.lng == null || !input.visibility) {
    throw ServiceError.validation("Missing required fields");
  }

  if (!["private", "group", "public"].includes(input.visibility)) {
    throw ServiceError.validation("Invalid visibility");
  }

  if (input.tags) {
    validateTags(input.tags);
  }

  const id = nanoid();
  const now = Math.floor(Date.now() / 1000);

  await spotsRepo.insertSpot(db, {
    id,
    name: input.name,
    description: input.description ?? null,
    lat: input.lat,
    lng: input.lng,
    visibility: input.visibility,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  if (input.tags && input.tags.length > 0) {
    await spotsRepo.insertSpotTags(db, id, input.tags);
  }

  return { id, name: input.name };
}

export async function updateSpot(
  db: D1Database,
  spotId: string,
  userId: string,
  input: {
    name?: string;
    description?: string;
    lat?: number;
    lng?: number;
    visibility?: "private" | "group" | "public";
    tags?: TagValue[];
  },
) {
  const existing = await spotsRepo.findSpotByOwner(db, spotId, userId);
  if (!existing) {
    throw ServiceError.notFound("Spot not found or not authorized");
  }

  if (input.visibility && !["private", "group", "public"].includes(input.visibility)) {
    throw ServiceError.validation("Invalid visibility");
  }

  if (input.tags) {
    validateTags(input.tags);
  }

  const now = Math.floor(Date.now() / 1000);

  await spotsRepo.updateSpot(db, spotId, {
    name: input.name,
    description: input.description,
    lat: input.lat,
    lng: input.lng,
    visibility: input.visibility,
  }, now);

  if (input.tags) {
    await spotsRepo.deleteSpotTags(db, spotId);
    if (input.tags.length > 0) {
      await spotsRepo.insertSpotTags(db, spotId, input.tags);
    }
  }

  return { id: spotId, updated: true };
}

export async function deleteSpot(
  db: D1Database,
  spotId: string,
  userId: string,
) {
  const existing = await spotsRepo.findSpotByOwner(db, spotId, userId);
  if (!existing) {
    throw ServiceError.notFound("Spot not found or not authorized");
  }

  await spotsRepo.deleteSpot(db, spotId);
  return { deleted: true };
}

export async function shareSpotToGroup(
  db: D1Database,
  spotId: string,
  groupId: string,
  userId: string,
) {
  const spot = await spotsRepo.findSpotByOwner(db, spotId, userId);
  if (!spot) {
    throw ServiceError.notFound("Spot not found or not authorized");
  }

  const membership = await groupsRepo.findMembership(db, groupId, userId);
  if (!membership) {
    throw ServiceError.forbidden("Not a member of this group");
  }

  await spotsRepo.insertSpotGroup(db, spotId, groupId);

  if (spot.visibility === "private") {
    await spotsRepo.updateSpotVisibility(
      db,
      spotId,
      "group",
      Math.floor(Date.now() / 1000),
    );
  }

  return { shared: true };
}

export async function unshareSpotFromGroup(
  db: D1Database,
  spotId: string,
  groupId: string,
  userId: string,
) {
  const spot = await spotsRepo.findSpotByOwner(db, spotId, userId);
  if (!spot) {
    throw ServiceError.notFound("Spot not found or not authorized");
  }

  await spotsRepo.deleteSpotGroup(db, spotId, groupId);
  return { unshared: true };
}
