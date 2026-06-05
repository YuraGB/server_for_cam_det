import db, { shadowUsers } from "@/db/drizzle";
import redis from "@/Redis";
import { eq } from "drizzle-orm";

const PERMISSIONS_TTL_SECONDS = 3600;

const permissionsKey = (userId: string) => `user:${userId}:permissions`;

const normalizePermissions = (permissions: unknown): string[] =>
  Array.isArray(permissions)
    ? [
        ...new Set(
          permissions
            .map((permission) =>
              typeof permission === "string" ? permission.trim() : "",
            )
            .filter((permission) => permission.length > 0),
        ),
      ]
    : [];

const parsePermissions = (permissionsJson: string | null | undefined) => {
  if (!permissionsJson) return [];

  try {
    return normalizePermissions(JSON.parse(permissionsJson));
  } catch {
    return [];
  }
};

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

export const getPermissionsFromRedis = async (userId: string) => {
  try {
    const permissionsJson = await redis.get(permissionsKey(userId));

    if (permissionsJson === null) return null;

    return parsePermissions(permissionsJson);
  } catch (error) {
    console.error("Error fetching user permissions from Redis:", error);
    throw new Error("Failed to fetch user permissions from Redis");
  }
};

export const getPermissinsFromRedis = getPermissionsFromRedis;

export const setPermissionsToRedis = async (
  userId: string,
  permissions: string[],
  ttlSeconds = PERMISSIONS_TTL_SECONDS,
) => {
  try {
    await redis.set(
      permissionsKey(userId),
      JSON.stringify(normalizePermissions(permissions)),
      "EX",
      ttlSeconds,
    );
  } catch (error) {
    console.error("Error setting user permissions to Redis:", error);
    throw new Error("Failed to set user permissions to Redis");
  }
};

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
