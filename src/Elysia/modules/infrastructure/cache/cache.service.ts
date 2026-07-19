import {
  normalizePermissions,
  parsePermissions,
} from "@/Elysia/utils/formatPermissions";
import redis from "@/Redis";

const PERMISSIONS_TTL_SECONDS = 3600;

const permissionsKey = (userId: string) => `user:${userId}:permissions`;

const getPermissionsFromRedis = async (userId: string) => {
  try {
    const permissionsJson = await redis.get(permissionsKey(userId));

    if (permissionsJson === null) return null;

    return parsePermissions(permissionsJson);
  } catch (error) {
    console.error("Error fetching user permissions from Redis:", error);
    throw new Error("Failed to fetch user permissions from Redis");
  }
};

const setPermissionsToRedis = async (
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

export { getPermissionsFromRedis, setPermissionsToRedis };
