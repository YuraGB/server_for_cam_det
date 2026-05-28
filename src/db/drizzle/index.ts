import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { shadowUsers } from "../schema/ShalowUsers";

const sqlite = new Database("db.sqlite");
const db = drizzle({ client: sqlite });

export default db;

export { shadowUsers };
