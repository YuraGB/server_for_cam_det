import db, { shadowUsers } from "@/db/drizzle";
import {
  getPermissionsFromRedis,
  setPermissionsToRedis,
} from "@/Elysia/modules/infrastructure/cache/cache.service";
import {
  normalizePermissions,
  parsePermissions,
} from "@/Elysia/utils/formatPermissions";
import redis from "@/Redis";
import { eq } from "drizzle-orm";

export async function upsertShadowUser(input: {
  id: string;
  name: string;
  email?: string;
  role?: string;
  emailVerified?: boolean;
  permissionsJson: string[];
  image?: string | null;
  createdAt?: string;
  updatedAt?: string;
}): Promise<void> {
  const now = new Date();
  const permissionsJson = JSON.stringify(
    normalizePermissions(input.permissionsJson),
  );

  try {
    await db
      .insert(shadowUsers)
      .values([
        {
          externalUserId: input.id,
          authIssuer: input.name,
          email: input.email,
          role: input.role,
          permissionsJson,
          lastLoginAt: now,
          createdAt: input.createdAt ? new Date(input.createdAt) : now,
          updatedAt: input.updatedAt ? new Date(input.updatedAt) : now,
        },
      ])
      .onConflictDoUpdate({
        target: shadowUsers.externalUserId,
        set: {
          authIssuer: input.name,
          email: input.email,
          role: input.role,
          permissionsJson,
          createdAt: input.createdAt ? new Date(input.createdAt) : now,
          updatedAt: input.updatedAt ? new Date(input.updatedAt) : now,
        },
      });
  } catch (error) {
    console.error("Failed to upsert shadow user:", error);
    throw error;
  }
}

export const getPermissionsFromDB = async (userId: string) => {
  try {
    const user = await db
      .select({
        permissionsJson: shadowUsers.permissionsJson,
      })
      .from(shadowUsers)
      .where(eq(shadowUsers.externalUserId, userId))
      .limit(1);

    if (user?.length === 0) {
      return [];
    }

    return parsePermissions(user?.[0]?.permissionsJson);
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    throw new Error("Failed to fetch user permissions");
  }
};

export const getUserPermissions = async (userId: string) => {
  const cached = await getPermissionsFromRedis(userId);

  if (cached !== null) {
    return cached;
  }

  const dbPermissions = await getPermissionsFromDB(userId);

  await setPermissionsToRedis(userId, dbPermissions);

  return dbPermissions;
};
