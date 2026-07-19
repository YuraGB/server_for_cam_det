import { getUserPermissions } from "../modules/Routes/User/Services";

export const hasPermissionsHandler = async (
  userId: string,
  allowedPermissions: string[],
) => {
  try {
    if (allowedPermissions.length === 0) {
      return true;
    }

    const userPermissions = await getUserPermissions(userId);

    const permissionSet = new Set(userPermissions);

    return allowedPermissions.every((perm) => permissionSet.has(perm));
  } catch (error) {
    console.error("Error checking user permissions:", error);
    throw new Error("Failed to check user permissions");
  }
};
