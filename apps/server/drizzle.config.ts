import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/index.ts',
  dialect: 'sqlite',
  dbCredentials: { url: `file:${process.env.DB_FILE_PATH!}` },
});
