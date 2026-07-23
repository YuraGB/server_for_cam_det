import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { shadowUsers } from "../schema/ShalowUsers";
import { DB_PATH } from "@/constants";

console.log("DB_PATH:", DB_PATH);
console.log("UID:", process.getuid?.());
const sqlite = new Database(DB_PATH);
const db = drizzle({ client: sqlite });

export default db;

export { shadowUsers };
