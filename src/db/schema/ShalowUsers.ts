import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const shadowUsers = sqliteTable(
  "shadow_users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    externalUserId: text("external_user_id").notNull().unique(),
    email: text("email").unique(),
    role: text("role"),
    rolesJson: text("roles_json").default("[]"),
    permissionsJson: text("permissions_json").notNull().default("[]"),
    authIssuer: text("auth_issuer").notNull(),
    lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("email_idx").on(table.email)],
);

export { shadowUsers };
