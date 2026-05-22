import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/drizzle/schema.ts",
  out: "./src/db/drizzle/migrations",
  dbCredentials: {
    url: "./db.sqlite",
  },
});
