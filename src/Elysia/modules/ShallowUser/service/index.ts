import db, { shadowUsers } from "@/db/drizzle";

export async function upsertShadowUser(input: {
  externalUserId: string;
  email?: string;
  role?: string;
  roles: string[];
  permissions: string[];
  authIssuer: string;
}): Promise<void> {
  const now = new Date();

  await db
    .insert(shadowUsers)
    .values([{
      externalUserId: input.externalUserId,
      email: input.email,
      role: input.role,
      rolesJson: JSON.stringify(input.roles),
      permissionsJson: JSON.stringify(input.permissions),
      authIssuer: input.authIssuer,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    }])
    .onConflictDoUpdate({
      target: shadowUsers.externalUserId,
      set: {
        email: input.email,
        role: input.role,
        rolesJson: JSON.stringify(input.roles),
        permissionsJson: JSON.stringify(input.permissions),
        authIssuer: input.authIssuer,
        lastLoginAt: now,
        updatedAt: now,
      },
    });
}

export async function getShadowUserByExternalId(externalUserId: string) {
  try {
  const user = await db
    .select()
    .from(shadowUsers)
    .where(shadowUsers.externalUserId.equals(externalUserId))
    .limit(1)
    .then(rows => rows[0] || null);

  return user;
  } catch(error) {
    console.error("Failed to get shadow user by external ID:", error);
    return null;
  }
}