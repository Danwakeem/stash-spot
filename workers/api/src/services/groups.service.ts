import { nanoid } from "nanoid";
import { ServiceError } from "./errors";
import * as groupsRepo from "../repos/groups.repo";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SK8-${code.slice(0, 3)}${code.slice(3)}`;
}

export async function listGroups(db: D1Database, userId: string) {
  return groupsRepo.findGroupsByUserId(db, userId);
}

export async function createGroup(
  db: D1Database,
  userId: string,
  name: string,
) {
  if (!name) {
    throw ServiceError.validation("Group name is required");
  }

  const id = nanoid();
  const inviteCode = generateInviteCode();

  await groupsRepo.insertGroupWithOwner(
    db,
    { id, name, inviteCode },
    userId,
  );

  return { id, name, invite_code: inviteCode };
}

export async function joinGroup(
  db: D1Database,
  userId: string,
  inviteCode: string,
) {
  if (!inviteCode) {
    throw ServiceError.validation("Invite code is required");
  }

  const group = await groupsRepo.findGroupByInviteCode(db, inviteCode);
  if (!group) {
    throw ServiceError.notFound("Invalid invite code");
  }

  const existing = await groupsRepo.findMembership(
    db,
    group.id as string,
    userId,
  );
  if (existing) {
    throw ServiceError.conflict("Already a member");
  }

  await groupsRepo.insertGroupMember(
    db,
    group.id as string,
    userId,
    "member",
  );

  return { group_id: group.id, name: group.name, joined: true };
}

export async function listGroupMembers(
  db: D1Database,
  groupId: string,
  requesterId: string,
) {
  const membership = await groupsRepo.findMembership(db, groupId, requesterId);
  if (!membership) {
    throw ServiceError.forbidden("Not a member of this group");
  }

  return groupsRepo.findGroupMembers(db, groupId);
}

export async function removeMember(
  db: D1Database,
  groupId: string,
  targetUserId: string,
  requesterId: string,
) {
  const ownership = await groupsRepo.findMembership(db, groupId, requesterId);
  if (!ownership || ownership.role !== "owner") {
    throw ServiceError.forbidden("Only group owners can remove members");
  }

  if (targetUserId === requesterId) {
    throw ServiceError.validation("Cannot remove yourself as owner");
  }

  await groupsRepo.deleteGroupMember(db, groupId, targetUserId);
  return { removed: true };
}
