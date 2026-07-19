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

export { normalizePermissions, parsePermissions };
