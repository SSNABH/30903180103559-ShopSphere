import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --experimental-strip-types prisma/seed.js",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://deci:deci_local_password@localhost:5432/deci_project?schema=public",
  },
});
