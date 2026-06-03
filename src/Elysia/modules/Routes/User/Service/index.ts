import db, { shadowUsers } from "@/db/drizzle";
import redis from "@/Redis";
import { eq } from "drizzle-orm";

export async function upsertShadowUser(input: {
  id: string;
  name: string;
  email?: string;
  role?: string;
  emailVerified?: boolean;
  permissionsJson: string[];
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}): Promise<void> {
  const now = new Date();

  try {
    await db
      .insert(shadowUsers)
      .values([
        {
          externalUserId: input.id,
          authIssuer: input.name,
          email: input.email,
          role: input.role,
          permissionsJson: JSON.stringify(input.permissionsJson),
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
          permissionsJson: JSON.stringify(input.permissionsJson),
          createdAt: input.createdAt ? new Date(input.createdAt) : now,
          updatedAt: input.updatedAt ? new Date(input.updatedAt) : now,
        },
      });
  } catch (error) {
    console.error("Failed to upsert shadow user:", error);
    throw error;
  }
}

// From Redis/Cache
export const getPermissinsFromRedis = async (userId: string) => {
  try {
    const permissionsJson = await redis.get(`user:${userId}:permissions`);

    if (!permissionsJson) {
      return [];
    }
    return JSON.parse(permissionsJson);
  } catch (error) {
    console.error("Error fetching user permissions from Redis:", error);
    throw new Error("Failed to fetch user permissions from Redis");
  }
};

export const setPermissionsToRedis = async (
  userId: string,
  permissions: string[],
  ttlSeconds = 3600,
) => {
  try {
    await redis.set(
      `user:${userId}:permissions`,
      JSON.stringify(permissions),
      "EX",
      ttlSeconds,
    );
  } catch (error) {
    console.error("Error setting user permissions to Redis:", error);
    throw new Error("Failed to set user permissions to Redis");
  }
};

// From DB
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

    return JSON.parse(user?.[0]?.permissionsJson ?? "[]");
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    throw new Error("Failed to fetch user permissions");
  }
};

export const getUserPermissions = async (userId: string) => {
  // 1. try cache
  const cached = await getPermissinsFromRedis(userId);

  if (cached?.length) {
    return cached;
  }

  // 2. fallback to DB
  const dbPermissions = await getPermissionsFromDB(userId);

  // 3. refill cache
  await setPermissionsToRedis(userId, dbPermissions);

  return dbPermissions;
};
