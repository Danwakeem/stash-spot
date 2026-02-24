import { ServiceError } from "./errors";
import * as usersRepo from "../repos/users.repo";

export async function getOrCreateUser(db: D1Database, userId: string) {
  let user = await usersRepo.findUserById(db, userId);

  if (!user) {
    await usersRepo.insertUser(db, userId, `user_${userId.slice(-8)}`);
    user = await usersRepo.findUserById(db, userId);
  }

  return user;
}

export async function updateUser(
  db: D1Database,
  userId: string,
  fields: { username?: string; avatar_url?: string },
) {
  if (!fields.username && !fields.avatar_url) {
    throw ServiceError.validation("Nothing to update");
  }

  return usersRepo.updateUser(db, userId, fields);
}
