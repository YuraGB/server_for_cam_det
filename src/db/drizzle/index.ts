import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { shadowUsers } from "./schema";

const sqlite = new Database("db.sqlite");
const db = drizzle({ client: sqlite });

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS shadow_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_user_id TEXT NOT NULL UNIQUE,
    email TEXT,
    role TEXT,
    roles_json TEXT NOT NULL DEFAULT '[]',
    permissions_json TEXT NOT NULL DEFAULT '[]',
    auth_issuer TEXT NOT NULL,
    last_login_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

export default db;
export { shadowUsers };
